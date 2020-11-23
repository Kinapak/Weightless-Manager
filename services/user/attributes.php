<?php
	// Получение всех кастомных атрибутов пользователя
	function getAllAttrs(array $args): array{
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/api/v1/attributes",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["token"]
		 )
		));
		$response = curl_exec($curl);
		curl_close($curl);
		
		return ["response" => $response];
	}