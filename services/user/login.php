<?php
	$tenant_id = "53cfab53-a6af-49d1-94a3-a182a24a3312"; // Идентификатор App ID
	
	// Получение токена пользователя для входа и использования приложения
	function getToken(array $args): array{
		global $tenant_id;
		
		// Преобразование к uri
		$redirect = $args["__ow_headers"]["origin"];
		$redirect = str_replace(":", "%3A", $redirect);
		$redirect = str_replace("/", "%2F", $redirect);
		
		// Запрос на получение токена
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
		$user_token = curl_exec($curl);
		$user_token = json_decode($user_token, true);
		curl_close($curl);
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		if(!checkScope($user_token["access_token"], $args["__ow_headers"]["origin"])) return ["response" => false];
		
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
		$info = curl_exec($curl);
		$info = json_decode($info, true);
		curl_close($curl);
		
		return ["response" => ["user_token" => $user_token["access_token"], "user_info" => $info]];
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
	
	function checkScope($token, $header){
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
		
		return $origin;
	}
