<?php
	require_once("_config.php");
	
	// Получение токена пользователя для входа и использования приложения
	function getToken(array $args): array{
		global $tenant_id, $api_key;
		
		$username = base64_decode($args["username"]);
		$username = str_replace("@", "%40", $username); // Обязательная замена для запроса
		$password = base64_decode($args["password"]);
		
		// Запрос на получение IAM-токена
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
		 CURLOPT_POSTFIELDS => "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=".$api_key
		));
		$iam = curl_exec($curl);
		$iam = json_decode($iam, true);
		curl_close($curl);
		
		// Поиск нужного пользователя для последующего получения его id
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users?email=".$username."&dataScope=full",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam["access_token"]
		 )
		));
		$user = curl_exec($curl);
		$user = json_decode($user, true);
		curl_close($curl);
		
		// Получение ролей пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users/".$user["users"][0]["id"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam["access_token"]
		 )
		));
		$roles = curl_exec($curl);
		$roles = json_decode($roles, true);
		curl_close($curl);
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$header = explode("//", $args["__ow_headers"]["origin"]);
		$origin = false;
		$role_id = 0;
		foreach($roles["roles"] as $role){
			if($role["name"] == $header[1]){
				$origin = true;
				$role_id = $role["id"];
				break;
			}
		}
		if(!$origin) return ["response" => false];
		
		// Получение идентификатора приложения
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/roles/".$role_id,
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam["access_token"]
		 )
		));
		$app_role = curl_exec($curl);
		$app_role = json_decode($app_role, true);
		curl_close($curl);
		
		// Получение данных приложения
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/applications/".$app_role["access"][0]["application_id"],
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam["access_token"]
		 )
		));
		$app = curl_exec($curl);
		$app = json_decode($app, true);
		curl_close($curl);
		
		// Запрос на получение токена с базовой авторизацией, логином и паролем
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($app["clientId"].":".$app["secret"])
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=password&username=".$username."&password=".$password
		));
		$token = curl_exec($curl);
		$token = json_decode($token, true);
		curl_close($curl);
		
		return ["response" => ["user_token" => $token["access_token"], "iam_token" => $iam["access_token"]]];
	}
	
	// Проверка токена пользователя на валидность
	function checkToken(array $args): array{
		global $client_id, $secret, $tenant_id;
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$token = explode(".", $args["token"]);
		$token = json_decode(base64_decode($token[1]), true);
		$header = explode("//", $args["__ow_headers"]["origin"]);
		$origin = false;
		foreach(explode(" ", $token["scope"]) as $scope){
			if($scope == $header[1]){
				$origin = true;
				break;
			}
		}
		if(!$origin) return ["response" => false];
		
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/introspect",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($client_id.":".$secret)
		 ),
		 CURLOPT_POSTFIELDS => "token=".$args["token"]
		));
		$response = curl_exec($curl);
		curl_close($curl);
		
		return ["response" => $response]; // Возвращает active: true || false
	}
