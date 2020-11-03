<?php
	function getToken(array $args): array{
		$args["username"] = str_replace("@", "%40", $args["username"]);
		
		$curl = curl_init();
		
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/53cfab53-a6af-49d1-94a3-a182a24a3312/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($args["clientId"].":".$args["secret"])
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=password&username=".$args["username"]."&password=".$args["password"]
		));
		
		$response = curl_exec($curl);
		
		curl_close($curl);
		
		return ["response" => $response];
	}
	
	function checkToken(array $args): array{
		$curl = curl_init();
		
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/53cfab53-a6af-49d1-94a3-a182a24a3312/introspect",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Authorization: Basic ".base64_encode($args["clientId"].":".$args["secret"])
		 ),
		 CURLOPT_POSTFIELDS => "token=".$args["token"]
		));
		
		$response = curl_exec($curl);
		
		curl_close($curl);
		
		return ["response" => $response];
	}
