$(document).ready(function(){
	
	// Получение баз данных с их параметрами
	function settings(){
		$.ajax({
			url: config.api_db_management + "/settings",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				$(".db-settings").remove();
				
				// Перебор баз данных для отображения
				$.each(result.databases, function(id, value){
					// Компановка блока с параметрами базы данных
					let block = '<div class="col-md-6 db-settings">\n' +
						'\t\t<div class="panel box-v1">\n' +
						'\t\t\t<div class="panel-heading bg-white border-none">\n' +
						'\t\t\t\t<div class="col-md-6 col-sm-6 col-xs-10 text-left padding-0">\n' +
						'\t\t\t\t\t<h4 class="text-left">' + value.name + '</h4>\n' +
						'\t\t\t\t</div>\n' +
						'\t\t\t\t<div class="col-md-6 col-sm-6 col-xs-2 text-right">\n' +
						'\t\t\t\t\t<h4>\n' +
						'\t\t\t\t\t\t<span class="fa fa-database text-right"></span>\n' +
						'\t\t\t\t\t</h4>\n' +
						'\t\t\t\t</div>\n' +
						'\t\t\t</div>\n' +
						'\t\t\t<div class="panel-body text-center">\n' +
						'\t\t\t\t\n' +
						'\t\t\t\t<form class="change-db" action="" method="post" data-db="' + id + '">\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="text" name="name" class="form-text" value="' + value.name + '" required>\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>Название (отображается в меню)</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="text" name="ip" class="form-text mask-ip_address" value="' + value.remote + '" required>\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>IP адрес</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="number" name="port" class="form-text" required value="' + value.port + '">\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>Порт</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="text" name="user" class="form-text" value="' + value.user + '">\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>Пользователь</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="password" name="password" class="form-text" value="">\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>Пароль</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<input type="text" name="db" class="form-text" value="' + value.db + '">\n' +
						'\t\t\t\t\t\t<span class="bar"></span>\n' +
						'\t\t\t\t\t\t<label>База данных</label>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<div class="form-group form-animate-text">\n' +
						'\t\t\t\t\t\t<select name="type" class="form-control" required>\n' +
						'\t\t\t\t\t\t\t<option value="0" disabled>Тип базы данных</option>\n' +
						'\t\t\t\t\t\t\t<option value="mysql">MySQL</option>\n' +
						'\t\t\t\t\t\t\t<option value="redis">Redis</option>\n' +
						'\t\t\t\t\t\t</select>\n' +
						'\t\t\t\t\t</div>\n' +
						'\t\t\t\t\t<button type="submit" class="btn btn-round btn-primary" style="float: left;">Изменить</button>\n' +
						'\t\t\t\t\t<button type="reset" class="btn btn-round btn-danger" style="float: right;">Удалить</button>\n' +
						'\t\t\t\t</form>\n' +
						'\t\t\t\t\n' +
						'\t\t\t</div>\n' +
						'\t\t</div>\n' +
						'\t</div>';
					$("#db-settings").append(block);
					
					// Установка поля типа базы данных к текущему
					$(".change-db[data-db='" + id + "'] [name='type'] option[value='" + value.type + "']").attr("selected", "selected");
				});
				
				// Изменение базы данных
				$(".change-db").on("submit", function(e){
					e.preventDefault();
					
					checkToken(); // Проверка авторизации
					
					let form = $(this), public_key;
					let encryption = new JSEncrypt();
					
					// Иконка лоадера. Также смена типа кнопки, чтобы данные не отправлялись вдогонку
					form.find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
					
					$.ajax({
						url: config.api_db_management + "/delete",
						type: "POST",
						dataType: "json",
						headers: {
							"Authorization": "Bearer " + localStorage.getItem("user_token")
						},
						data: {
							"name": form.closest(".change-db").data("db"),
							"iam-token": localStorage.getItem("IAM_token")
						},
						success: function(){
							// Получение и инициализация публичного ключа
							$.ajax({
								url: config.api_db_management + "/publicKey",
								type: "POST",
								dataType: "json",
								headers: {
									"Authorization": "Bearer " + localStorage.getItem("user_token")
								},
								data: {
									"iam-token": localStorage.getItem("IAM_token")
								},
								success: function(result){
									public_key = result.public_key;
									
									// Проверка публичного ключа. Если его нет, выход
									if(public_key.length > 1) encryption.setPublicKey(public_key);
									else return false;
									
									// Обработка селекта
									if(!form.find("[name='type']").val()){
										form.find("[name='type']").addClass("danger");
										return false;
									} else form.find("[name='type']").removeClass("danger");
									
									// Запрос на добавление базы данных
									$.ajax({
										url: config.api_db_management + "/add",
										type: "POST",
										dataType: "json",
										headers: {
											"Authorization": "Bearer " + localStorage.getItem("user_token")
										},
										data: {
											"name": form.find("[name='name']").val(),
											"ip": form.find("[name='ip']").val(),
											"port": form.find("[name='port']").val(),
											"user": encryption.encrypt(form.find("[name='user']").val()),
											"password": encryption.encrypt(form.find("[name='password']").val()),
											"db": encryption.encrypt(form.find("[name='db']").val()),
											"type": form.find("[name='type']").val(),
											"iam-token": localStorage.getItem("IAM_token")
										},
										success: function(result){
											// Если успешно, то сброс формы и вывод всего остального, иначе вывод ошибки
											if(!result.response.error){
												wmAlert("Параметры базы данных успешно обновлены", "success");
												dbList();
												settings();
											} else wmAlert(result.response.error, "fail");
											
											// Сброс кнопки в любом случае
											form.find("[type='button']").html("Изменить").attr("type", "submit");
										},
										error: function(result){
											// Если ошибка, то сброс кнопки и вывод логов
											form.find("[type='button']").html("Добавить").attr("type", "submit");
											wmAlert("Ошибка! См. логи. ", "fail");
											console.log(result);
										}
									});
								},
								error: function(result){
									// Если ошибка, то сброс кнопки и вывод логов
									form.find("[type='button']").html("Добавить").attr("type", "submit");
									wmAlert("Ошибка! См. логи. ", "fail");
									console.log(result);
								}
							});
						},
						error: function(result){
							// Если ошибка, то вывод логов
							wmAlert("Ошибка! См. логи", "fail");
							console.log(result);
						}
					});
				});
				
				// Удаление базы данных
				$(".change-db button[type='reset']").on("click", function(){
					
					checkToken(); // Проверка авторизации
					
					let $this = $(this);
					
					// Иконка лоадера. Также смена типа кнопки, чтобы данные не отправлялись вдогонку
					$this.html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
					
					$.ajax({
						url: config.api_db_management + "/delete",
						type: "POST",
						dataType: "json",
						headers: {
							"Authorization": "Bearer " + localStorage.getItem("user_token")
						},
						data: {
							"name": $this.closest(".change-db").data("db"),
							"iam-token": localStorage.getItem("IAM_token")
						},
						success: function(result){
							wmAlert("База данных успешно удалена", "success");
							$this.closest(".db-settings").fadeOut(400, function(){
								$this.closest(".db-settings").remove();
							});
							dbList();
						},
						error: function(result){
							// Если ошибка, то вывод логов
							wmAlert("Ошибка! См. логи", "fail");
							console.log(result);
						}
					});
				});
			}
		});
	}
	
	settings();
	
	// Обработка формы на добавление новой базы данных
	$("#add-database").on("submit", function(e){
		e.preventDefault();
		
		checkToken(); // Проверка авторизации
		
		let form = $(this), public_key;
		let encryption = new JSEncrypt();
		
		// Иконка лоадера. Также смена типа кнопки, чтобы данные не отправлялись вдогонку
		$(this).find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
		
		// Получение и инициализация публичного ключа
		$.ajax({
			url: config.api_db_management + "/publicKey",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				public_key = result.public_key;
				
				// Проверка публичного ключа. Если его нет, выход
				if(public_key.length > 1) encryption.setPublicKey(public_key);
				else return false;
				
				// Обработка селекта
				if(!form.find("[name='type']").val()){
					form.find("[name='type']").addClass("danger");
					return false;
				} else form.find("[name='type']").removeClass("danger");
				
				// Запрос на добавление базы данных
				$.ajax({
					url: config.api_db_management + "/add",
					type: "POST",
					dataType: "json",
					headers: {
						"Authorization": "Bearer " + localStorage.getItem("user_token")
					},
					data: {
						"name": $("[name='name']").val(),
						"ip": $("[name='ip']").val(),
						"port": $("[name='port']").val(),
						"user": encryption.encrypt($("[name='user']").val()),
						"password": encryption.encrypt($("[name='password']").val()),
						"db": encryption.encrypt($("[name='db']").val()),
						"type": $("[name='type']").val(),
						"iam-token": localStorage.getItem("IAM_token")
					},
					success: function(result){
						// Если успешно, то сброс формы и вывод всего остального, иначе вывод ошибки
						if(!result.response.error){
							wmAlert("База данных успешно добавлена", "success");
							form.trigger("reset");
							dbList();
							settings();
						} else wmAlert(result.response.error, "fail");
						
						// Сброс кнопки в любом случае
						form.find("[type='button']").html("Добавить").attr("type", "submit");
					},
					error: function(result){
						// Если ошибка, то сброс кнопки и вывод логов
						form.find("[type='button']").html("Добавить").attr("type", "submit");
						wmAlert("Ошибка! См. логи. ", "fail");
						console.log(result);
					}
				});
			},
			error: function(result){
				// Если ошибка, то сброс кнопки и вывод логов
				form.find("[type='button']").html("Добавить").attr("type", "submit");
				wmAlert("Ошибка! См. логи. ", "fail");
				console.log(result);
			}
		});
	});
	
});