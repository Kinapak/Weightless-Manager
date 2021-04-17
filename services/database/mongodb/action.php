<?php
	require_once("vendor/autoload.php");
	require_once("_config.php");
	
	// Получение всех коллекций в базе данных
	function getCollections(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		$collections = $db->listCollections();
		if(!$collections) return ["response" => ["empty" => ["Коллекции" => "База данных пуста."]]];
		
		// Обработка коллекций
		$collections_list = array();
		foreach($collections as $collection)
			$collections_list[] = ["Коллекции" => $collection->getName()];
		
		return ["response" => ["collections" => $collections_list]];
	}
	
	// Подключение к базе данных MongoDB
	function connect($args){
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
		$client = new MongoDB\Client("mongodb://".$db["user"].":".$db["password"]."@".$db["remote"].":".$db["port"]."/".$db["db"]);
		if(!$client) return ["response" => ["error" => "Ошибка подключения"]];
		
		// Возврат базы данных для дальнейшего использования
		$db = $client->selectDatabase(empty($db["db"]) ? "admin" : $db["db"]);
		return $db;
	}