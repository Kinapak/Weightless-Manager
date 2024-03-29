<?php
	$curl = curl_init();
	curl_setopt_array($curl, array(
	 CURLOPT_URL => "https://russiabase.ru/wm/version.php",
	 CURLOPT_FOLLOWLOCATION => true,
	 CURLOPT_RETURNTRANSFER => true,
	 CURLOPT_TIMEOUT => 60
	));
	$version = curl_exec($curl);
	curl_close($curl);
	if(!$version) exit("Не удалось получить новую версию");
	
	$index = file_get_contents("https://russiabase.ru/wm/".$version."/manager/index.html");
	if(!$index) exit("Не удалось получить обновление");
	
	$apis = json_decode(file_get_contents("https://russiabase.ru/wm/apis.json"), true);
	if(!$apis) exit("Не удалось получить API");
	
	$config = json_decode(file_get_contents("config.json"), true);
	if(!$config) exit("Не удалось получить текущую конфигурацию");
	
	foreach($config as $key => $value)
		if(preg_match("/api_/", $key) and !$apis[$key]) unset($config[$key]);
	foreach($apis as $api => $url)
		$config[$api] = $url;
	$config["version"] = $version;
	
	$file = fopen("manager/index.html", "w+");
	fwrite($file, $index);
	fclose($file);
	
	$file = fopen("config.json", "w+");
	fwrite($file, json_encode($config));
	fclose($file);
	
	echo 1;