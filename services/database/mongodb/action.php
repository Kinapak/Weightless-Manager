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
	
	// Получение коллекции и ее документов
	function getCollection(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		// Выборка из БД
		$collection = $db->selectCollection($args["collection"]);
		$documents = $collection->find();
		$documents->setTypeMap(["root" => "array"]);
		
		// Обработка документов
		$documents_list = array();
		foreach($documents as $document)
			$documents_list[] = ["_id" => $document["_id"], "Документ" => json_encode($document)];
		
		return ["response" => ["documents" => $documents_list]];
	}
	
	// Добавление новой коллекции
	function newCollection(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		// Добавляем коллекцию
		$db->createCollection($args["collection"]);
		
		return ["response" => "Success"];
	}
	
	// Удаление коллекции
	function deleteCollection(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		// Удаляем коллекцию
		$db->dropCollection($args["collection"]);
		
		return ["response" => "Success"];
	}
	
	// Получение документа из коллекции
	function getMongoDBDocument(array $args): array{
		if(empty(trim($args["_id"]))) // Проверка идентификатора
			return ["response" => ["error" => "Некорректный запрос"]];
		
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		// Выборка из БД в зависимости от типа идентификатора
		try{
			$_id = new MongoDB\BSON\ObjectId($args["_id"]);
		} catch(MongoDB\Driver\Exception\Exception $e){
			$_id = preg_match("/[a-z]|[A-Z]/", $args["_id"]) ? $args["_id"] : (int)$args["_id"];
		}
		$collection = $db->selectCollection($args["collection"]);
		$documents = $collection->find(['_id' => $_id]);
		$documents->setTypeMap(["root" => "array"]);
		
		// Обработка документов
		foreach($documents as $document)
			$doc = json_encode($document);
		
		return ["response" => ["document" => $doc]];
	}
	
	// Обновление документа
	function updateDocument(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		$collection = $db->selectCollection($args["collection"]);
		
		// Обновление документа в зависимости от типа идентификатора
		try{
			$_id = new MongoDB\BSON\ObjectId($args["_id"]);
		} catch(MongoDB\Driver\Exception\Exception $e){
			$_id = preg_match("/[a-z]|[A-Z]/", $args["_id"]) ? $args["_id"] : (int)$args["_id"];
		}
		$updated = json_decode($args["updated"], true);
		unset($updated["_id"]);
		$collection->replaceOne(['_id' => $_id], $updated);
		
		return ["response" => "Success"];
	}
	
	// Удаление документа
	function removeDocument(array $args): array{
		// Получение экземпляра базы данных MongoDB или вывод ошибки
		$db = connect($args);
		if(is_array($db)) return ["response" => ["error" => $db["response"]["error"]]];
		
		// Удаление документа в зависимости от типа идентификатора
		try{
			$_id = new MongoDB\BSON\ObjectId($args["_id"]);
		} catch(MongoDB\Driver\Exception\Exception $e){
			$_id = preg_match("/[a-z]|[A-Z]/", $args["_id"]) ? $args["_id"] : (int)$args["_id"];
		}
		$collection = $db->selectCollection($args["collection"]);
		$collection->deleteOne(['_id' => $_id]);
		
		return ["response" => "Success"];
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