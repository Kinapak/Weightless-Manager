<?php
	require_once("_config.php");
	
	$link = null; // Ссылка на текущий экземпляр БД
	
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
	
	// Операция добавления значений в таблицу БД
	function tableInsert(array $args): array{
		global $link;
		
		// Обработка ошибок
		if(!strlen(trim($args["table"])) or !count($args["fields"]))
			return ["response" => ["error" => "ОШИБКА: Некорректный запрос!"]];
		
		$args["fields"] = json_decode($args["fields"], true);
		
		// Обработка полей и значений для добавления в базу данных
		foreach($args["fields"] as $field => $value){
			$fields .= "`".trim($field)."`,";
			$values .= "'".trim($value)."',";
		}
		$fields = substr($fields, 0, -1);
		$values = substr($values, 0, -1);
		
		$sql = "INSERT INTO `".$args["table"]."` (".$fields.") VALUES (".$values.")";
		
		$res = query($args, $sql);
		
		// Запрос последней вставленной строки, если передан ключ
		if(strlen(trim($args["primary_field"]))){
			$last_row_sel = query(
			 $args,
			 "SELECT * FROM `".$args["table"]."` WHERE ".$args["primary_field"]."='".mysqli_insert_id($link)."'"
			);
			$last_row = mysqli_fetch_assoc($last_row_sel);
		}
		
		return ["response" => $res === true ? $res : ["error" => $res], "last_row" => $last_row ? $last_row : null];
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
		global $link;
		$link = connect($connect_args);
		
		// Если нет аргументов, проверяем, должны ли быть
		if(!count($query_args) and preg_match("/%/", $sql)) return false;
		
		// Преобразование строкового аргумента в строку
		$sql = str_replace("%s", "'%s'", $sql);
		
		// Если есть аргументы, форматируем строку. В противном случае просто устраняем пробелы
		if(count($query_args) > 0){
			foreach($query_args as $key => $arg){ // Обработка аргументов и уязвимостей
				$query_args[$key] = mysqli_real_escape_string($link, $arg);
				$query_args[$key] = preg_replace("/script/i", "", $arg);
				$query_args[$key] = preg_replace("/\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/ix", "", $arg);
				$query_args[$key] = strip_tags($arg);
				$query_args[$key] = htmlentities($arg, ENT_QUOTES);
			}
			$sql = vsprintf(trim($sql), $query_args);
		} else $sql = trim($sql);
		
		if(!$sql or !strlen($sql)) return false; // Финальная проверка запроса
		
		$result = mysqli_query($link, $sql);
		
		if(!mysqli_error($link)) return $result;
		else return mysqli_error($link);
	}
	
	// Подключение к базе данных MySQL
	function connect(array $args){
		global $to_decrypt;
		
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		
		// Получение приватного ключа из настроек приложения
		$app = getDocument($args["iam-token"], "applications", $origin[1]);
		$private_key = $app["document"]["private_key"];
		
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
		$connect = mysqli_connect($db["remote"], $db["user"], $db["password"], $db["db"], $db["port"]);
		if(!$connect) return ["response" => ["error" => "Ошибка подключения"]];
		
		mysqli_set_charset($connect, "UTF8");
		
		return $connect;
	}