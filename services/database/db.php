<?php
	function connect(array $args): array{
		global $private_key, $tenant_id;
		
		$to_decrypt = [ // Поля для дешифрования
		 "user",
		 "password",
		 "db"
		];
		
		// Нахождение основного email пользователя, который является документом в базе данных
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/oauth/v4/".$tenant_id."/userinfo",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "POST",
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["user-token"]
		 )
		));
		$email = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		// Получение необходимой базы данных
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://ff7c931e-24a9-42ce-b841-88963bcd0391-bluemix.cloudant.com/user_db/".$email["email"],
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"],
		  "Content-Type: application/json"
		 )
		));
		$databases = json_decode(curl_exec($curl), true);
		curl_close($curl);
		$db = $databases["databases"][$args["db"]]; // Массив с параметрами запрашиваемой базы данных
		
		// Дешифрование параметров для подключения
		foreach($to_decrypt as $field){
			openssl_private_decrypt(base64_decode($db[$field]), $decrypted, openssl_get_privatekey($private_key));
			$db[$field] = $decrypted;
		}
		
		// Подключение и проверка корректности подключения
		$connect = mysqli_connect($db["remote"], $db["user"], $db["password"], $db["db"], $db["port"]);
		if(!$connect) return ["response" => ["error" => "Ошибка подключения"]];
		
		return ["connection" => $connect];
	}