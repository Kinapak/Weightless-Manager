<?php
	$type_list = array("mysql");
	$tenant_id = "53cfab53-a6af-49d1-94a3-a182a24a3312"; // Идентификатор AppID
	$cloudant_url = "https://ff7c931e-24a9-42ce-b841-88963bcd0391-bluemix.cloudant.com/";
	
	// Добавление новой базы данных
	function addDB(array $args): array{
		global $type_list, $public_key, $cloudant_url;
		
		$data = [ // Инициализация данных
		 "name" => strval(trim($args["name"])),
		 "type" => strval(trim($args["type"])),
		 "remote" => strval(trim($args["ip"])),
		 "port" => intval(trim($args["port"])),
		 "user" => strval(trim($args["user"])),
		 "password" => strval(trim($args["password"])),
		 "db" => strval(trim($args["db"]))
		];
		$to_encrypt = [ // Поля для шифрования
		 "user",
		 "password",
		 "db"
		];
		
		$document = getUserDocument(["user-token" => $args["user-token"], "iam-token" => $args["iam-token"]]);
		$document = $document["document"];
		
		// Получение списка всех баз данных для добавления к ним новой
		$databases = $document["databases"];
		if($databases[$data["name"]]) // Проверка на существование введенного названия БД
			return ["response" => ["error" => "Данное название для базы данных уже занято"]];
		
		// Проверяем тип базы данных по белому списку
		if(array_search($data["type"], $type_list) === false)
			return ["response" => ["error" => "Данный тип базы данных не поддерживается"]];
		
		// Шифрование чувствительных полей
		foreach($to_encrypt as $field){
			openssl_public_encrypt($data[$field], $encrypted, openssl_get_publickey($public_key));
			$data[$field] = chunk_split(base64_encode($encrypted));
		}
		
		// Добавление новой БД в документ пользователя к уже имеющимся
		$databases[$data["name"]] = $data;
		$put = json_encode(["_rev" => $document["_rev"], "databases" => $databases]);
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url."user_db/".$document["_id"],
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => $put,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"],
		  "Content-Type: application/json"
		 )
		));
		curl_exec($curl);
		curl_close($curl);
		
		return ["response" => "Successful"];
	}
	
	// Получение списка названий-идентификаторов баз данных пользователя
	function getDBList(array $tokens): array{
		$document = getUserDocument($tokens);
		$document = $document["document"];
		foreach($document["databases"] as $id => $val) $databases[$val["name"]] = $val["name"];
		return ["databases" => $databases];
	}
	
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