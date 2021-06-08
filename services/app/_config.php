<?php
	$tenant_id = "99f870dc-02ac-4082-812e-f9a271bcd35d";
	$cloudant_url = "https://aa5c968d-2972-4175-b569-700a1328047f-bluemix.cloudant.com/";
	
	$key_types = array("PUBLIC", "PRIVATE"); // Допустимые типы ключей
	
	// Префикс для папки с логами каждого приложения
	$bucket_prefix = "weightlessmanager-logs-";
	
	// Ключ для IAM-токена логирования
	$logs_key = "DsR9SBDvuUiLAQgpeA3gjDrU7a3_GasQlMaERL98RMV4";
	
	// URL для запросов к логам
	$logs_url = "https://s3.eu-gb.cloud-object-storage.appdomain.cloud";
	
	// Получение документа из Cloudant
	function getDocument($iam, $db, $application): array{
		global $cloudant_url;
		
		$curl = curl_init();
		curl_setopt_array($curl, array(
		 CURLOPT_URL => $cloudant_url.$db."/".$application,
		 CURLOPT_RETURNTRANSFER => true,
		 CURLOPT_TIMEOUT => 60,
		 CURLOPT_HTTPHEADER => array(
		  "Authorization: Bearer ".$iam,
		  "Content-Type: application/json"
		 )
		));
		$document = json_decode(curl_exec($curl), true);
		curl_close($curl);
		
		return ["document" => $document];
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