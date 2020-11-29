<?php
	$type_list = array("mysql");
	
	// Добавление новой базы данных
	function addDB(array $args): array{
		global $type_list, $public_key;
		
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
		
		// Проверка на существование введенного имени БД
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/api/v1/attributes/databases",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["token"]
		 )
		));
		$databases = curl_exec($curl);
		curl_close($curl);
		
		/* Запрос возвращает строку, которая плохо декодируется
		 * Поэтому необходимо выполнить ряд преобразований для избавления от массива
		 * Затем необходимо разложить строку с объектами на массив для дальнейшего перебора */
		$databases = json_decode($databases, true);
		$databases["databases"] = str_replace("[", "", $databases["databases"]);
		$databases["databases"] = str_replace("]", "", $databases["databases"]);
		$databases = explode("},{", $databases["databases"]);
		
		foreach($databases as $db){
			/* Т.к. разделитель удаляется, элементам массива необходимо заново прописать { и } в нужных местах
			 * Затем уже можно производить декодирование и сравнение имен */
			if(strpos($db, "{") === false) $db = "{".$db;
			if(strpos($db, "}") === false) $db = $db."}";
			$db = json_decode($db, true);
			if($db["name"] == $data["name"]) return ["response" => ["error" => "Данное название для базы данных уже занято"]];
			else $put[] = $db;
		}
		
		// Проверяем тип базы данных по белому списку
		if(array_search($data["type"], $type_list) === false)
			return ["response" => ["error" => "Данный тип базы данных не поддерживается"]];
		
		// Шифрование чувствительных полей
		foreach($to_encrypt as $field){
			openssl_public_encrypt($data[$field], $encrypted, openssl_get_publickey($public_key));
			$data[$field] = chunk_split(base64_encode($encrypted));
		}
		
		// Добавление новой БД в атрибуты
		$put[] = $data;
		$put = json_encode($put);
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/api/v1/attributes/databases",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => $put,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["token"],
		  "Accept: application/json",
		  "Content-Type: application/json"
		 )
		));
		curl_exec($curl);
		curl_close($curl);
		
		return ["response" => "Successful"];
	}