<?php
	require_once("_config.php");
	
	// Добавление ключа шифрования
	function addKey(array $args): array{
		global $cloudant_url, $key_types;
		
		// Проверка типа ключа
		$type = trim($args["type"]);
		if(array_search(mb_strtoupper($type), $key_types) === false)
			return ["response" => ["error" => "Некорректный тип ключа"]];
		
		// Проверка ключа
		$key = strval(trim($args["key"]));
		if(!preg_match("/".mb_strtoupper($type)."/", $key)) return ["response" => ["error" => "Некорректный тип ключа"]];
		
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		
		// Получение документа с настройками приложения
		$document = getDocument($args["iam-token"], "applications", $origin[1]);
		$document = $document["document"];
		
		// Замена нужного ключа
		$keys = $document["keys"];
		$keys[$type."_key"] = $key;
		
		// Обновление настроек приложения
		$put = json_encode(["_rev" => $document["_rev"], "keys" => $keys]);
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url."applications/".$document["_id"],
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
		$upd = curl_exec($curl);
		curl_close($curl);
		if(!$upd) return ["response" => ["error" => "У вас нет прав для этого действия"]];
		else return ["response" => "Seccessful"];
	}