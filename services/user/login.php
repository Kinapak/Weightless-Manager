<?php
	$tenant_id = "53cfab53-a6af-49d1-94a3-a182a24a3312";
	$client_id = "c956120d-0f5f-49dc-9586-e78d31699e00";
	$secret = "NGQ0YWIwOTMtYjViNy00YTRhLWI5MWMtNmQ2MGUxYjMxYWJk";
	
	function getToken(array $args): array{
		global $client_id, $secret, $tenant_id;
		$username = base64_decode($args["username"]);
		$password = base64_decode($args["password"]);
		
		$username = str_replace("@", "%40", $username);
		
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
		
		$response = curl_exec($curl);
		
		curl_close($curl);
		
		return ["response" => $response];
	}
	
	function checkToken(array $args): array{
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
		
		return ["response" => $response];
	}
