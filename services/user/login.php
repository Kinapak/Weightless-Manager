<?php
	require_once("_config.php");
	
	// Получение токена пользователя для входа и использования приложения
	function getToken(array $args): array{
		global $tenant_id, $appid_key, $cloudant_reader_key, $cloudant_writer_key;
		
		// Преобразование к uri
		$redirect = $args["__ow_headers"]["origin"];
		$redirect = str_replace(":", "%3A", $redirect);
		$redirect = str_replace("/", "%2F", $redirect);
		
		// Запрос на получение токена пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($args["app_id"].":".$args["secret"])
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=authorization_code&redirect_uri=".$redirect."&code=".$args["code"]
		));
		$user_token = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$scope = checkScope($user_token["access_token"], $args["__ow_headers"]["origin"]);
		if(!$scope["origin"]) return ["response" => false];
		
		// Получение данных о пользователе
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/userinfo",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Bearer ".$user_token["access_token"]
		 )
		));
		$info = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		// Запрос на получение IAM-токена для прочтения ролей пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://iam.cloud.ibm.com/identity/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Accept: application/json"
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=".$appid_key
		));
		$iam = json_decode(curl_exec($curl), true);
		curl_close($curl);
		if(!$iam) return ["response" => false];
		
		// Получение ролей пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users/".$info["sub"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam["access_token"]
		 )
		));
		$roles = json_decode(curl_exec($curl), true);
		
		// Проверка прав доступа
		$roles_exists = [
		 "WM_".$scope["domain"]."_access_manager" => $cloudant_writer_key,
		 "WM_".$scope["domain"]."_access_user" => $cloudant_reader_key
		];
		$access = false;
		foreach($roles["roles"] as $role){
			if($roles_exists[$role["name"]]){
				$access = $roles_exists[$role["name"]];
				break;
			}
		}
		if(!$access) return ["response" => false]; // Завершение функции, если нет прав доступа
		
		// Запрос на получение финального IAM-токена для работы с приложением
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://iam.cloud.ibm.com/identity/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Accept: application/json"
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=".$access
		));
		$iam = json_decode(curl_exec($curl), true);
		curl_close($curl);
		if(!$iam) return ["response" => false];
		
		return [
		 "response" => [
		  "user_token" => $user_token["access_token"],
		  "iam_token" => $iam["access_token"],
		  "user_info" => $info
		 ]
		];
	}
	
	// Проверка токена пользователя на валидность
	function checkToken(array $args): array{
		global $tenant_id;
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		if(!checkScope($args["token"], $args["__ow_headers"]["origin"])) return ["response" => false];
		
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/introspect",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($args["app_id"].":".$args["secret"])
		 ),
		 CURLOPT_POSTFIELDS => "token=".$args["token"]
		));
		$response = curl_exec($curl);
		curl_close($curl);
		
		return ["response" => $response]; // Возвращает active: true || false
	}
	
	// Проверка области, определенной в токене
	function checkScope($token, $header): array{
		$token = explode(".", $token);
		$token = json_decode(base64_decode($token[1]), true);
		$header = explode("//", $header);
		$origin = false;
		
		foreach(explode(" ", $token["scope"]) as $scope){
			if($scope == $header[1]){
				$origin = true;
				break;
			}
		}
		
		return ["origin" => $origin, "domain" => $header[1]];
	}
