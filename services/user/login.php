<?php
	require_once("_config.php");
	
	// Получение токена пользователя для входа и использования приложения
	function getToken(array $args): array{
		global $client_id, $secret, $tenant_id, $api_key;
		$username = base64_decode($args["username"]);
		$password = base64_decode($args["password"]);
		
		$username = str_replace("@", "%40", $username); // Обязательная замена для запроса
		
		// Запрос на получение токена с базовой авторизацией, логином и паролем
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($client_id.":".$secret)
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=password&username=".$username."&password=".$password
		));
		$response["user_token"] = curl_exec($curl);
		curl_close($curl);
		
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
		$response["iam_token"] = curl_exec($curl);
		curl_close($curl);
		
		return ["response" => $response];
	}
	
	// Проверка токена пользователя на валидность
	function checkToken(array $args): array{
		global $client_id, $secret, $tenant_id;
		
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
