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
		$document["keys"][$type."_key"] = $key;
		
		// Обновление настроек приложения
		$put = json_encode($document);
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
	
	// Назначение роли новому для приложения пользователю
	function addUser(array $args): array{
		global $tenant_id;
		
		// Проверка и подготовка аргументов
		$email = str_replace("@", "%40", trim($args["email"]));
		$role = trim($args["role"]);
		if(!strlen($email)) return ["response" => ["error" => "Не указан email пользователя"]];
		if(!strlen($role)) return ["response" => ["error" => "Ошибка добавления нового пользователя"]];
		
		// Поиск нужного пользователя для последующего получения его id
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users?email=".$email."&dataScope=full",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"]
		 )
		));
		$user = json_decode(curl_exec($curl), true);
		curl_close($curl);
		if(!$user) return ["response" => ["error" => "Указанный пользователь не найден"]];
		
		// Получение ролей пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users/".$user["users"][0]["id"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"]
		 )
		));
		$roles = json_decode(curl_exec($curl), true);
		if(!$roles) return ["response" => ["error" => "Указанный пользователь не найден"]];
		
		// Обработка других ролей и назначение новой
		$header = explode("//", $args["__ow_headers"]["origin"]);
		$new_roles = ["roles" => ["names" => []]];
		// Предварительно сбор старых ролей, исключая роли по текущему приложению
		foreach($roles["roles"] as $rl)
			if(!preg_match("/".$header[1]."_access/", $rl["name"])) $new_roles["roles"]["names"][] = $rl["name"];
		$new_roles["roles"]["names"][] = "WM_".$header[1]."_access_".$role;
		
		// Добавление обновленных ролей
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users/".$user["users"][0]["id"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => json_encode($new_roles),
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"],
		  "Content-Type: application/json"
		 )
		));
		$upd = curl_exec($curl);
		curl_close($curl);
		if(!$upd) return ["response" => ["error" => "Что-то пошло не так"]];
		else return ["response" => "Successful"];
	}
	
	// Удаление пользователя из приложения
	function removeUser(array $args): array{
		global $tenant_id;
		
		// Проверка и подготовка аргументов
		$email = str_replace("@", "%40", trim($args["email"]));
		if(!strlen($email)) return ["response" => ["error" => "Не указан email пользователя"]];
		
		// Поиск нужного пользователя для последующего получения его id
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users?email=".$email."&dataScope=full",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"]
		 )
		));
		$user = json_decode(curl_exec($curl), true);
		curl_close($curl);
		if(!$user) return ["response" => ["error" => "Указанный пользователь не найден"]];
		
		// Получение ролей пользователя
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/".$tenant_id."/users/".$user["users"][0]["id"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"]
		 )
		));
		$roles = json_decode(curl_exec($curl), true);
		if(!$roles) return ["response" => ["error" => "Указанный пользователь не найден"]];
		
		// Обработка других ролей и удаление роли текущего приложения
		$header = explode("//", $args["__ow_headers"]["origin"]);
		$new_roles = ["roles" => ["names" => []]];
		foreach($roles["roles"] as $role)
			if(!preg_match("/".$header[1]."_access/", $role["name"])) $new_roles["roles"]["names"][] = $role["name"];
		
		// Добавление обновленных ролей
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://eu-gb.appid.cloud.ibm.com/management/v4/53cfab53-a6af-49d1-94a3-a182a24a3312/users/".$user["users"][0]["id"]."/roles",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => json_encode($new_roles),
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$args["iam-token"],
		  "Content-Type: application/json"
		 )
		));
		$upd = curl_exec($curl);
		curl_close($curl);
		if(!$upd) return ["response" => ["error" => "Что-то пошло не так"]];
		else return ["response" => "Successful"];
	}