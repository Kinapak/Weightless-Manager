<?php
	require_once("_config.php");
	
	// Получение всех таблиц в базе данных
	function getDBTables(array $args): array{
		// Получение всех таблиц в БД или вывод ошибки
		$res = query($args, "SHOW TABLES");
		if(!$res) $tables["error"] = "ОШИБКА: Некорректный запрос!";
		
		// Выдача ответа в массиве для DataTable.js
		if(!mysqli_num_rows($res)) $tables["empty"] = [["В данной базе данных нет таблиц."]];
		else while($row = mysqli_fetch_array($res)) $tables[] = [$row[0]];
		
		return ["tables" => $tables];
	}
	
	// Получение данных в таблице
	function getTable(array $args): array{
		// Получение части данных по переданному лимиту в таблице и выдача ответа
		$res = query(
		 $args,
		 "SELECT * FROM `".$args["table"]."` limit %d, %d",
		 [$args["limit_first"], $args["limit_second"]]
		);
		if(!$res) $data["error"] = "ОШИБКА: Некорректный запрос!";
		if(!mysqli_num_rows($res) and $args["limit_first"] == 0) $data["empty"] = [["Таблица пуста."]];
		else{
			// Получение первичного ключа, если есть
			$primarysel = query($args, "SHOW INDEX FROM `".$args["table"]."` WHERE Key_name = %s", ["PRIMARY"]);
			$primary = mysqli_fetch_assoc($primarysel);
			
			// Обработка полученных данных
			while($row = mysqli_fetch_assoc($res)) $data[] = $row;
		}
		
		return ["data" => $data, "primary_field" => $primary["Column_name"]];
	}
	
	// Операция обновления в таблице БД
	function tableUpdate(array $args): array{
		// Обработка ошибок
		if(
		 !strlen(trim($args["table"])) or
		 !strlen(trim($args["changed_field"])) or
		 !strlen(trim($args["changed_value"])) or
		 !strlen(trim($args["primary_field"])) or
		 !strlen(trim($args["primary_value"]))
		) return ["response" => ["error" => "ОШИБКА: Некорректный запрос!"]];
		
		// Строка запроса будет иметь вид: UPDATE `table` SET `field`=%s ...
		$sql = "UPDATE `".$args["table"]."` SET";
		$sql .= " `".trim($args["changed_field"])."`=%s";
		$sql .= " WHERE ".trim($args["primary_field"])."=%s"; // Добавление условия с плейсхолдерами к строке запроса
		
		// Конечный вид строки запроса: UPDATE `table` SET `field`=%s WHERE field1=%s
		$res = query($args, $sql, [$args["changed_value"], $args["primary_value"]]);
		
		return ["response" => $res === true ? $res : ["error" => $res]];
	}
	
	// Запрос к базе данных с плейсхолдерами
	function query(array $connect_args, $sql, $query_args = array()){
		// Инициализация базы данных
		$link = connect($connect_args);
		
		// Если нет аргументов, проверяем, должны ли быть
		if(!count($query_args) and preg_match("/%/", $sql)) return false;
		
		// Преобразование строкового аргумента в строку
		$sql = str_replace("%s", "'%s'", $sql);
		
		// Если есть аргументы, форматируем строку. В противном случае просто устраняем пробелы
		if(count($query_args) > 0){
			foreach($query_args as $key => $arg) // Обработка аргументов
				$query_args[$key] = mysqli_real_escape_string($link, $arg);
			$sql = vsprintf(trim($sql), $query_args);
		} else $sql = trim($sql);
		
		if(!$sql or !strlen($sql)) return false; // Финальная проверка запроса
		
		$result = mysqli_query($link, $sql);
		
		if(!mysqli_error($link)) return $result;
		else return mysqli_error($link);
	}
	
	// Подключение к базе данных MySQL
	function connect(array $args){
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
		
		mysqli_set_charset($connect, "UTF8");
		
		return $connect;
	}