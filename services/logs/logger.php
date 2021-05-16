<?php
	require_once("_config.php");
	
	// Добавление нового лога
	function setLog(array $args): array{
		global $logs_key, $logs_url, $bucket_prefix;
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$scope = checkScope($args["user-token"], $args["__ow_headers"]["origin"]);
		if(!$scope["origin"]) return ["response" => false];
		
		// Имена для логов
		$bucket_name = $bucket_prefix.$scope["domain"];
		$file_name = date("d.m.Y").".txt";
		
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
		
		// Запрос и проверка текущего документа с логами
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $logs_url."/".$bucket_name."/".$file_name,
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam
		 )
		));
		$current_doc = curl_exec($curl);
		if(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) == 404) $current_doc = "";
		curl_close($curl);
		
		// Добавление нового лога
		$current_doc .= "UK-".date("H:i:s")." ".$args["log"]."\r\n";
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $logs_url."/".$bucket_name."/".$file_name,
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_CUSTOMREQUEST => "PUT",
		 CURLOPT_POSTFIELDS => $current_doc,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam
		 )
		));
		curl_exec($curl);
		curl_close($curl);
		
		return ["response" => true];
	}
	
	function getLogs(array $args): array{
		global $logs_key, $logs_url, $bucket_prefix;
		
		// Проверка на соответствие пользователя домену, с которого идет запрос
		$scope = checkScope($args["user-token"], $args["__ow_headers"]["origin"]);
		if(!$scope["origin"]) return ["response" => false];
		
		// Имена для логов
		$bucket_name = $bucket_prefix.$scope["domain"];
		$file_name = date("d.m.Y").".txt";
		
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
		
		// Запрос и проверка текущего документа с логами
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $logs_url."/".$bucket_name."/".$file_name,
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_FOLLOWLOCATION => 1,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam
		 )
		));
		$logs = curl_exec($curl);
		if(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) == 404) return ["logs" => false];
		curl_close($curl);
		$logs = explode("\r\n", $logs);
		
		// Сборка логов для выдачи на клиент
		$ret = array();
		foreach($logs as $log){
			$log = explode(" ", $log);
			
			// Если логи по пользователю, пропускаем все остальные
			if($args["user"] and $log[3] != $args["user"]) continue;
			
			$log[0] = str_replace("UK-", "", $log[0]);
			$ret[] = ["time" => $log[0], "operation" => $log[1], "duration" => $log[2], "user" => $log[3]];
		}
		
		return ["logs" => $ret];
	}
	
	// Проверка области, определенной в токене
	function checkScope($token, $header): array{
		$token = explode(".", $token);
		$token = json_decode(base64_decode($token[1]), true);
		$header = explode("//", $header);
		$origin = false;
		
		foreach(explode(" ", $token["scope"]) as $scope){
			if($scope == $header[1]){
				$origin = true;
				break;
			}
		}
		
		return ["origin" => $origin, "domain" => $header[1]];
	}