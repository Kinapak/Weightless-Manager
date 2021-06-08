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
	
	// Получение текущего баланса
	function getCredits(array $args): array{
		$origin = explode("//", $args["__ow_headers"]["origin"]);
		
		$document = getDocument($args["iam-token"], "applications", $origin[1]);
		$credits = $document["document"]["credits"];
		
		return ["credits" => $credits];
	}
	
	// Оплата по логам приложения и вывод оставшегося баланса
	function payment(array $args): array{
		global $logs_key, $logs_url, $bucket_prefix, $cloudant_url;
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$scope = checkScope($args["user-token"], $args["__ow_headers"]["origin"]);
		if(!$scope["origin"]) return ["response" => false];
		
		// Имя для контейнера
		$bucket_name = $bucket_prefix.$scope["domain"];
		
		// Параметры для биллинга в $
		$billing = [
		 "auth" => 0.00428,
		 "cloudant_read" => 0.00267,
		 "cloudant_write" => 0.00535,
		 "func" => 0.000017 // За секунду
		];
		$multiplier = 1.5; // Множитель для надбавки
		$course = 73; // Курс рубля
		
		// Получение текущего баланса
		$credits = getCredits($args);
		$credits = $credits["credits"];
		
		// Получение IAM-токена для хранилища логов
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => "https://iam.cloud.ibm.com/identity/token",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_POST => true,
		 CURLOPT_HTTPHEADER => array(
		  "Content-Type: application/x-www-form-urlencoded",
		  "Accept: application/json"
		 ),
		 CURLOPT_POSTFIELDS => "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=".$logs_key
		));
		$iam = json_decode(curl_exec($curl), true);
		$iam = $iam["access_token"];
		curl_close($curl);
		
		// Запрос списка документов с логами
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $logs_url."/".$bucket_name."?list-type=2",
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam
		 )
		));
		$objects = curl_exec($curl);
		curl_close($curl);
		
		// Парсинг списка объектов
		$p = xml_parser_create();
		xml_parse_into_struct($p, $objects, $files);
		xml_parser_free($p);
		foreach($files as $file){
			if($file["tag"] != "KEY") continue; // Нужны только теги KEY
			if(preg_match("/PAYED/", $file["value"])) continue; // Пропуск уже оплаченных
			if($file["value"] == date("d.m.Y").".txt") continue; // Пропуск сегодняшнего лога
			
			// Запрос текущего файла с логами
			$curl = curl_init();
			curl_setopt_array($curl, array(
			 CURLOPT_URL => $logs_url."/".$bucket_name."/".$file["value"],
			 CURLOPT_RETURNTRANSFER => true,
			 CURLOPT_FOLLOWLOCATION => 1,
			 CURLOPT_TIMEOUT => 60,
			 CURLOPT_HTTPHEADER => array(
			  "Authorization: Bearer ".$iam
			 )
			));
			$logs = curl_exec($curl);
			$logs = explode("\r\n", $logs);
			curl_close($curl);
			
			// Обработка файла с логами
			foreach($logs as $log){
				$log = explode(" ", $log);
				
				$credits -= ($billing["func"] * ($log[2] / 1000) * $multiplier) * $course;
				if(preg_match("/token/", $log[1]))
					$credits -= ($billing["auth"] * $multiplier) * $course;
				if(preg_match("/database/", $log[1]))
					$credits -= ($billing["cloudant_read"] * $multiplier) * $course;
				if(preg_match("/database\/management\/(add|delete)/", $log[1]))
					$credits -= ($billing["cloudant_write"] * $multiplier) * $course;
				if(preg_match("/addKey/", $log[1]))
					$credits -= ($billing["cloudant_write"] * $multiplier) * $course;
			}
			
			// Копирование файла логов с новым именем
			$new_log = str_replace(".txt", "-PAYED.txt", $file["value"]);
			$curl = curl_init();
			curl_setopt_array($curl, array(
			 CURLOPT_URL => $logs_url."/".$bucket_name."/".$new_log,
			 CURLOPT_RETURNTRANSFER => true,
			 CURLOPT_FOLLOWLOCATION => 1,
			 CURLOPT_TIMEOUT => 60,
			 CURLOPT_CUSTOMREQUEST => "PUT",
			 CURLOPT_HTTPHEADER => array(
			  "Authorization: Bearer ".$iam,
			  "x-amz-copy-source: ".$bucket_name."/".$file["value"]
			 )
			));
			curl_exec($curl);
			curl_close($curl);
			
			// Удаление предыдущего файла
			$curl = curl_init();
			curl_setopt_array($curl, array(
			 CURLOPT_URL => $logs_url."/".$bucket_name."/".$file["value"],
			 CURLOPT_RETURNTRANSFER => true,
			 CURLOPT_FOLLOWLOCATION => 1,
			 CURLOPT_TIMEOUT => 60,
			 CURLOPT_CUSTOMREQUEST => "DELETE",
			 CURLOPT_HTTPHEADER => array(
			  "Authorization: Bearer ".$iam
			 )
			));
			curl_exec($curl);
			curl_close($curl);
		}
		
		$credits = round($credits, 2);
		
		// Получение документа с настройками приложения
		$document = getDocument($args["iam-token"], "applications", $scope["domain"]);
		$document = $document["document"];
		
		// Замена баланса
		$document["credits"] = $credits;
		
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
		curl_exec($curl);
		curl_close($curl);
		
		return ["credits" => $credits];
	}