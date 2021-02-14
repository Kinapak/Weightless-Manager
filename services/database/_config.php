<?php
	$cloudant_url = "https://ff7c931e-24a9-42ce-b841-88963bcd0391-bluemix.cloudant.com/";
	$db_type_list = array("mysql");
	
	$public_key = "-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKqaAv+EykBhBbncrEiYJM37DOSKsHdJ
F7gkGKx2uvJ2uIK8rZnJDuIckSAiNoiBXehpILDlaOGKKLyyL8U2lbMCAwEAAQ==
-----END PUBLIC KEY-----";
	$private_key = "-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBAKqaAv+EykBhBbncrEiYJM37DOSKsHdJF7gkGKx2uvJ2uIK8rZnJ
DuIckSAiNoiBXehpILDlaOGKKLyyL8U2lbMCAwEAAQJAPGHehcnePAMbH7m3UMpo
3G7rFUjxRIceWhKMmR489Ov0K5CCKxcLG0ODIRU23slHHe08SpfUAvn96oODEQ18
AQIhANuuAcnTi0MjcERTCkWlUwFpsjiPwYbrDmnXHhybvHQzAiEAxs7DTWtJx3s7
4QkKFGyxXUEVWo58w1bJbpcpAST32IECIBs8JnKcLG7FbPy7gtGBnpnVPcgvYmHU
sHPEvLH1SNbrAiBj5ZNnfIi3Luo4upURDEjXRhPXzA9PDHXtFxGonI3ZgQIhAMVb
AX8Ek/Id43hNyEga1LeYXECc26mVkK3SSzGj32PD
-----END RSA PRIVATE KEY-----";
	$to_decrypt = ["user", "password", "db"]; // Поля для дешифрования
	
	$tenant_id = "53cfab53-a6af-49d1-94a3-a182a24a3312"; // Идентификатор App ID
	
	// Получение документа пользователя из Cloudant
	function getUserDocument(array $tokens): array{
		global $tenant_id, $cloudant_url;
		
		// Нахождение основного email пользователя, который является документом в базе данных
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/userinfo",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "POST",
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$tokens["user-token"]
		 )
		));
		$email = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		// Получение документа пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url."user_db/".$email["email"],
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$tokens["iam-token"],
		  "Content-Type: application/json"
		 )
		));
		$document = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		return ["document" => $document];
	}