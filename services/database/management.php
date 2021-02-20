<?php
	require_once("_config.php");
	
	// Добавление новой базы данных
	function addDB(array $args): array{
		global $cloudant_url, $db_type_list;
		
		$data = [ // Инициализация данных
		 "name" => strval(trim($args["name"])),
		 "type" => strval(trim($args["type"])),
		 "remote" => strval(trim($args["ip"])),
		 "port" => intval(trim($args["port"])),
		 "user" => strval(trim($args["user"])),
		 "password" => strval(trim($args["password"])),
		 "db" => strval(trim($args["db"]))
		];
		
		// Получение баз данных приложения
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		$document = getDocument($args["iam-token"], "app_db", $origin[1]);
		$document = $document["document"];
		$databases = $document["databases"];
		if($databases[$data["name"]]) // Проверка на существование введенного названия БД
			return ["response" => ["error" => "Данное название для базы данных уже занято"]];
		
		// Проверяем тип базы данных по белому списку
		if(array_search($data["type"], $db_type_list) === false)
			return ["response" => ["error" => "Данный тип базы данных не поддерживается"]];
		
		// Добавление новой БД в документ пользователя к уже имеющимся
		$databases[$data["name"]] = $data;
		$put = json_encode(["_rev" => $document["_rev"], "databases" => $databases]);
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url."app_db/".$document["_id"],
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
	
	function deleteDB(array $args): array{
		global $cloudant_url;
		
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		
		// Получение баз данных
		$document = getDocument($args["iam-token"], "app_db", $origin[1]);
		$document = $document["document"];
		$databases = $document["databases"];
		
		$name = strval(trim($args["name"])); // Имя базы данных для удаления
		
		unset($databases[$name]); // Удаление БД из списка
		
		// Обновление документа
		$upd = json_encode(["_rev" => $document["_rev"], "databases" => $databases]);
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url."app_db/".$document["_id"],
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => $upd,
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
	function getDBList(array $token): array{
		$origin = explode("//", $token["__ow_headers"]["origin"]);
		$document = getDocument($token["iam-token"], "app_db", $origin[1]);
		$document = $document["document"];
		foreach($document["databases"] as $id => $val)
			$databases[$val["name"]] = $val["name"];
		return ["databases" => $databases];
	}
	
	// Получение списка баз данных для страницы настроек
	function getDBSettings(array $token): array{
		global $to_decrypt;
		
		$origin = explode("//", $token["__ow_headers"]["origin"]);
		
		// Получение приложения
		$app = getDocument($token["iam-token"], "applications", $origin[1]);
		$app = $app["document"];
		
		// Получение баз данных
		$db = getDocument($token["iam-token"], "app_db", $origin[1]);
		$db = $db["document"];
		
		$private_key = $app["private_key"];
		
		foreach($db["databases"] as $id => $val){
			// Расшифровка полей для подстановки в форму
			foreach($to_decrypt as $field){
				if(!$val[$field]) continue;
				openssl_private_decrypt(base64_decode($val[$field]), $decrypted, openssl_get_privatekey($private_key));
				$val[$field] = $decrypted;
			}
			
			$databases[$id] = $val;
		}
		
		return ["databases" => $databases];
	}
	
	// Получение публичного ключа для шифрования необходимых полей на клиенте
	function getPublicKey(array $args): array{
		$header = explode("//", $args["__ow_headers"]["origin"]);
		$app = getDocument($args["iam-token"], "applications", $header[1]);
		return ["public_key" => $app["document"]["public_key"]];
	}