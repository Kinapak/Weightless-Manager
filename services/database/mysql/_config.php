<?php
	$cloudant_url = "https://ff7c931e-24a9-42ce-b841-88963bcd0391-bluemix.cloudant.com/";
	$db_type_list = array("mysql", "mongodb");
	
	$to_decrypt = ["user", "password", "db"]; // Поля для дешифрования
	
	$tenant_id = "53cfab53-a6af-49d1-94a3-a182a24a3312"; // Идентификатор App ID
	
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