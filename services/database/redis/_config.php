<?php
	$cloudant_url = "https://aa5c968d-2972-4175-b569-700a1328047f-bluemix.cloudant.com/";
	
	$to_decrypt = ["user", "password", "db"]; // Поля для дешифрования
	
	$tenant_id = "99f870dc-02ac-4082-812e-f9a271bcd35d"; // Идентификатор App ID
	
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