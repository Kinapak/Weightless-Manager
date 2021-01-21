<?php
	require_once("_config.php");
	
	// Получение всех таблиц в базе данных
	function getDBTables(array $args): array{
		// Инициализация базы данных
		$connection = connect($args);
		$link = $connection["connection"];
		
		// Получение всех таблиц в БД или вывод предупреждения
		$res = mysqli_query($link, "SHOW TABLES");
		// Выдача ответа в массиве для DataTable.js
		if(!mysqli_num_rows($res)) $tables["empty"] = [["В данной базе данных нет таблиц."]];
		else while($row = mysqli_fetch_array($res)) $tables[] = [$row[0]];
		
		return ["tables" => $tables];
	}
	
	// Подключение к базе данных MySQL
	function connect(array $args): array{
		global $private_key, $to_decrypt;
		
		$document = getUserDocument(["user-token" => $args["user-token"], "iam-token" => $args["iam-token"]]);
		$document = $document["document"];
		$db = $document["databases"][$args["db"]]; // Массив с параметрами запрашиваемой базы данных
		
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