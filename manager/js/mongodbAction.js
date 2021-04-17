$(document).ready(function(){
	
	let current_db = $(".databases-list").find("li.active").text(); // Текущая база данных
	let dt; // Экземпляр таблицы для DataTable
	
	// Отображение коллекций базы данных при загрузке страницы
	$.ajax({
		url: config.api_db_mongodb + "/collections",
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
			
			// Установка названия текущей БД в заголовках
			$("#db-name").html("<span>" + current_db + "</span>");
			$("title").text("Weightless Manager | " + current_db);
			
			// Отображение коллекций
			dt = $('#db-view').DataTable({
				columns: [
					{
						data: "Коллекции",
						title: "Коллекции"
					}
				],
				data: result.response.collections,
				paging: false,
				language: {
					url: "https://russiabase.ru/wm/v0.4.0/manager/js/plugins/dataTables.russian.json"
				}
			});
			
			$('#db-view tbody').attr("data-type", "collections");
			
			// Кнопка добавления новой коллекции
			setTimeout(function(){
				$("#db-view_wrapper .row:eq(0) .col-sm-6:eq(0)").append(
					"<p style='margin: 0; padding: 10px 1px;'>" +
					"<span id='set-collection' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer;'>" +
					"Добавить коллекцию" +
					"</span>" +
					"</p>"
				);
			}, 100);
			
			$("#db-loading").css("display", "none");
		},
		error: function(error){
			wmAlert("Ошибка подключения", "fail");
			console.log(error);
		}
	});
	
	// Обработка новой коллекции
	$(".responsive-table").on("click", "#set-collection", function(){
		// Повторное нажатие закрывает добавление ключа
		if($("#new-collection").length){
			$("#new-collection").parent().remove();
			return false;
		}
		
		// Добавление строки для новых значений над таблицей
		$(this).closest(".row").append(
			"<div class='col-sm-12'>" +
			"<table id='new-collection' class='table table-bordered dataTable'><tr></tr></table>" +
			"<button id='add-collection' class='btn btn-round btn-primary' style='transform: scale(0.9);'>Добавить</button>" +
			"</div>"
		);
		
		// Добавление новых ячеек с шириной, как в таблице
		$("#db-view th").each(function(){
			$("#new-collection tr").append(
				"<td style='width: " + $(this).css("width") + ";' contenteditable='true' data-parent='" + $(this).text() + "'></td>"
			);
		});
		
		// Сразу фокусировка на первом поле
		$("#new-collection tr td:eq(0)").focus();
		
		// Отправка новых данных
		$("#new-collection").parent().on("click", "#add-collection", function(){
			let $this = $(this);
			
			// Отображение загрузки и блокировка кнопки
			$(this).html("<i class='fa fa-spinner fa-pulse fa-lg'></i>");
			$(this).attr("id", "");
			
			// Инициализация новой коллекции
			let new_collection = $("#new-collection tr td").text();
			
			$.ajax({
				url: config.api_db_mongodb + "/newCollection",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"collection": new_collection,
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					// Вывод ошибки
					if(result.response.error){
						wmAlert(result.response.error, "fail");
						$this.html("Добавить");
						$this.attr("id", "add-collection");
						return false;
					}
					
					// Добавление новой строки к таблице
					dt.rows.add([{"Коллекции": new_collection}]).draw();
					
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
	
});