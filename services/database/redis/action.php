<?php
	require_once("vendor/predis/predis/autoload.php");
	require_once("_config.php");
	
	// Получение всех ключей в базе данных
	function getKeys(array $args): array{
		// Получение клиента Redis или вывод ошибки
		$client = connect($args);
		if(is_array($client)) return ["response" => ["error" => $client["response"]["error"]]];
		
		$keys = $client->keys("*");
		if(!$keys) return ["response" => ["empty" => ["Ключ" => "База данных пуста.", "Значение" => ""]]];
		
		foreach($keys as $key)
			$keys_list[] = ["Ключ" => $key, "Значение" => $client->get($key)];
		
		return ["response" => ["keys" => $keys_list]];
	}
	
	// Создание нового ключа
	function update(array $args): array{
		// Получение клиента Redis или вывод ошибки
		$client = connect($args);
		if(is_array($client)) return ["response" => ["error" => $client["response"]["error"]]];
		
		// Если изменяется имя ключа, и новое имя уже существует, выводим ошибку
		if(strlen($args["old_key"]) > 0 and $client->exists($args["key"]))
			return ["response" => ["error" => "Данный ключ уже существует, воспользуйтесь поиском"]];
		
		// Если было изменено имя ключа, удаляем старое
		if(strlen($args["old_key"]) > 0) $client->del($args["old_key"]);
		
		// Создание нового или редактирование существующего ключа
		$client->set($args["key"], $args["value"]);
		
		return ["response" => "Success"];
	}
	
	// Создание нового ключа
	function setKey(array $args): array{
		// Получение клиента Redis или вывод ошибки
		$client = connect($args);
		if(is_array($client)) return ["response" => ["error" => $client["response"]["error"]]];
		
		$args["keys"] = json_decode($args["keys"], true);
		
		// Если ключ уже существует, выводим ошибку
		if($client->exists($args["keys"]["Ключ"]))
			return ["response" => ["error" => "Данный ключ уже существует, воспользуйтесь поиском"]];
		
		// Добавление ключа
		if(!$client->set($args["keys"]["Ключ"], $args["keys"]["Значение"]))
			return ["response" => ["error" => "Ошибка добавления ключа"]];
		
		return ["response" => "Success"];
	}
	
	// Удаление ключа
	function delKey(array $args): array{
		// Получение клиента Redis или вывод ошибки
		$client = connect($args);
		if(is_array($client)) return ["response" => ["error" => $client["response"]["error"]]];
		
		// Удаление ключа
		$client->del($args["key"]);
		
		return ["response" => "Success"];
	}
	
	// Подключение к базе данных Redis
	function connect(array $args){
		global $to_decrypt;
		
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		
		// Получение приватного ключа из настроек приложения
		$app = getDocument($args["iam-token"], "applications", $origin[1]);
		$private_key = $app["document"]["keys"]["private_key"];
		
		// Получение базы данных из настроек
		$document = getDocument($args["iam-token"], "app_db", $origin[1]);
		$document = $document["document"];
		$db = $document["databases"][$args["db"]]; // Массив с параметрами запрашиваемой базы данных
		
		// Дешифрование параметров для подключения
		foreach($to_decrypt as $field){
			openssl_private_decrypt(base64_decode($db[$field]), $decrypted, openssl_get_privatekey($private_key));
			$db[$field] = $decrypted;
		}
		
		// Подключение и проверка корректности подключения
		$client = new Predis\Client(
		 array(
		  "scheme" => "tcp",
		  "host" => $db["remote"],
		  "port" => $db["port"]
		 ),
		 array(
		  "parameters" => [
			"password" => $db["password"],
			"database" => empty($db["db"]) ? 0 : $db["db"]
		  ]
		 )
		);
		if(!$client) return ["response" => ["error" => "Ошибка подключения"]];
		
		return $client;
	}