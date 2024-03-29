$(document).ready(function(){
	
	let current_db = $(".databases-list").find("li.active").text(); // Текущая база данных
	let dt; // Экземпляр таблицы для DataTable
	
	// Установка названия текущей БД в заголовках
	$("#db-name").html("<span>" + current_db + "</span>");
	$("title").text("Weightless Manager | " + current_db);
	
	// Отображение ключей базы данных при загрузке страницы
	$.ajax({
		url: config.api_db_redis + "/keys",
		type: "POST",
		dataType: "json",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"db": current_db,
			"iam-token": localStorage.getItem("IAM_token")
		},
		success: function(result){
			// Вывод ошибки
			if(result.response.error){
				wmAlert(result.response.error, "fail");
				return false;
			}
			
			// Если уже инициализирован экземпляр таблицы, необходимо его удалить
			if(dt){
				dt.destroy();
				$('#db-view').html("");
			}
			
			// Отображение пар ключ-значение
			dt = $('#db-view').DataTable({
				columns: [
					{
						data: "Ключ",
						title: "Ключ"
					},
					{
						data: "Значение",
						title: "Значение"
					}
				],
				data: result.response.keys,
				pageLength: 50,
				language: {
					url: "https://russiabase.ru/wm/v0.5.0/manager/js/plugins/dataTables.russian.json"
				}
			});
			
			$('#db-view tbody').attr("data-type", "keys");
			
			// Кнопка добавления нового ключа
			setTimeout(function(){
				$(".dataTables_length").append(
					"<span id='set-key' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer; margin-left: 10px;'>" +
					"Добавить ключ" +
					"</span>"
				);
				
				// Кнопка удаления ключа
				if(!result.response.empty)
					$.each($("tbody tr"), function(){
						$($(this).find($("td"))[0]).append("<i class='fa fa-close fa-lg remove-row' title='Удалить ключ'></i>");
					});
			}, 100);
			
			$("#db-loading").css("display", "none");
		},
		error: function(error){
			wmAlert("Ошибка подключения", "fail");
			console.log(error);
		}
	});
	
	// Обновление выбранного значения
	$("#db-view").on("dblclick", "tbody[data-type='keys'] td", function(){
		$(this).attr("contentEditable", true);
		$(this).focus();
		
		// Если было изменено имя ключа, запоминаем старое для удаления
		let old_key;
		if($(this).index() === 0) old_key = $(this).text();
		
		// Подготовка значений для проверки изменений
		let changed, last = $(this).text();
		let $this = $(this);
		
		function update(){
			changed = $this.text();
			$this.attr("contentEditable", false);
			
			// Если значение не менялось, выход из функции
			if(changed === last) return false;
			
			// Сборка ключ-значение
			let key = $this.parent().find("td:eq(0)").text();
			let value = $this.parent().find("td:eq(1)").text();
			
			// Отправка изменений
			$.ajax({
				url: config.api_db_redis + "/update",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"old_key": old_key,
					"key": key,
					"value": value,
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					if(result.response.error) wmAlert(result.response.error, "fail");
				}
			});
		}
		
		// Обновление данных по нажатию клавиши enter
		$this.keydown(function(e){
			if(e.keyCode === 13){
				// Если нет редактируемого поля или клик был совершен по нему, выход из функции
				if(!$this) return false;
				
				update();
				$this = null; // Устранение дублей
			}
		});
		
		// Обновление данных по клику вне блока
		$(document).click(function(e){
			// Если нет редактируемого поля или клик был совершен по нему, выход из функции
			if(!$this || $this.is(e.target)) return false;
			
			update();
			$this = null; // Устранение дублей
		});
	});
	
	// Обработка нового ключа
	$(".responsive-table").on("click", "#set-key", function(){
		// Повторное нажатие закрывает добавление ключа
		if($("#new-key").length){
			$("#new-key").parent().remove();
			return false;
		}
		
		// Добавление строки для новых значений над таблицей
		$(this).closest(".row").append(
			"<div class='col-sm-12'>" +
			"<table id='new-key' class='table table-bordered dataTable'><tr></tr></table>" +
			"<button id='add-key' class='btn btn-round btn-primary' style='transform: scale(0.9);'>Добавить</button>" +
			"</div>"
		);
		
		// Добавление новых ячеек с шириной, как в таблице
		$("#db-view th").each(function(){
			$("#new-key tr").append(
				"<td style='width: " + $(this).css("width") + ";' contenteditable='true' data-parent='" + $(this).text() + "'></td>"
			);
		});
		
		// Сразу фокусировка на первом поле
		$("#new-key tr td:eq(0)").focus();
		
		// Отправка новых данных
		$("#new-key").parent().on("click", "#add-key", function(){
			let $this = $(this);
			
			// Отображение загрузки и блокировка кнопки
			$(this).html("<i class='fa fa-spinner fa-pulse fa-lg'></i>");
			$(this).attr("id", "");
			
			// Инициализация новых значений
			let keys = {};
			$("#new-key tr td").each(function(){
				keys[$(this).data("parent")] = $(this).text();
			});
			
			$.ajax({
				url: config.api_db_redis + "/set",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"keys": JSON.stringify(keys),
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					// Вывод ошибки
					if(result.response.error){
						wmAlert(result.response.error, "fail");
						$this.html("Добавить");
						$this.attr("id", "add-key");
						return false;
					}
					
					// Добавление новой строки к таблице
					dt.rows.add([keys]).draw();
					
					// Заново добавляем кнопку удаления ключа, в т.ч. и новой строке
					$(".remove-row").remove();
					$.each($("tbody tr"), function(){
						$($(this).find($("td"))[0]).append("<i class='fa fa-close fa-lg remove-row' title='Удалить ключ'></i>");
					});
					
					$this.parent().remove();
				},
				error: function(error){
					$this.html("Добавить");
					$this.attr("id", "add-key");
					wmAlert("Ошибка подключения", "fail");
					console.log(error);
				}
			});
		});
	});
	
	// Удаление ключа
	$(".responsive-table").on("click", ".remove-row", function(){
		if(!confirm("Подтвердите удаление")) return false;
		
		$(this).removeClass("fa-close").addClass("fa-spinner fa-pulse");
		let $this = $(this);
		
		// Удаление строки из таблицы БД
		$.ajax({
			url: config.api_db_redis + "/del",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"key": $this.parent().text(),
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				// Удаление строки из таблицы на клиенте
				$this.parent().parent().remove();
			},
			error: function(error){
				wmAlert("Ошибка подключения", "fail");
				console.log(error);
			}
		});
	});
	
});