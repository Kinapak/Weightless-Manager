$(document).ready(function(){
	
	let current_db = $(".databases-list").find("li.active").text(); // Текущая база данных
	let current_collection; // Текущая коллекция
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
	
	// Просмотр коллекции
	$("#db-view").on("click", "tbody[data-type='collections'] td", function(){
		current_collection = $(this).text().trim(); // Название коллекции для выборки из БД
		
		// Запрос коллекции
		function requestCollection(){
			// Удаление текущей таблицы
			dt.destroy();
			$('#db-view').html("");
			$("#db-loading").css("display", "block");
			
			$.ajax({
				url: config.api_db_mongodb + "/collection",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"collection": current_collection,
					"db": current_db,
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					// Вывод ошибки
					if(result.response.error){
						wmAlert(result.response.error, "fail");
						return false;
					}
					
					// Добавление названия коллекции и кнопки обновления к заголовкам
					$("#db-name")
						.append("<span id='current_col'> > " + current_collection + "</span>")
						.append(" <i id='col-reload' class='fa fa-refresh' style='cursor:pointer;color:#d2d2d2;font-size:16px;'></i>");
					$("title").append(" > " + current_collection);
					
					// Обработка клика по кнопке перезагрузки таблицы
					$("#col-reload").click(function(){
						$("#current_col, #col-reload").remove();
						requestCollection();
					});
					
					$("#db-loading").css("display", "none");
					
					// Подготовка идентификаторов
					$.each(result.response.documents, function(id, val){
						result.response.documents[id]["_id"] = val._id.$oid;
					});
					
					// Инициализация новой таблицы с колонками
					dt = $('#db-view').DataTable({
						columns: [
							{
								"data": "_id",
								"title": "_id"
							},
							{
								"data": "Документ",
								"title": "Документ"
							}
						],
						data: result.response.documents,
						pageLength: 50,
						language: {
							url: "https://russiabase.ru/wm/v0.4.0/manager/js/plugins/dataTables.russian.json"
						}
					});
					
					setTimeout(function(){
						$.each($("tbody tr"), function(){
							// Добавление кнопки удаления документа
							$($(this).find($("td"))[0]).append("<i class='fa fa-close fa-lg remove-row' title='Удалить документ'></i>");
							
							// Обрезка длинных JSON
							$($(this).find("td")[1]).text(function(i, text){
								if(text.length >= 100)
									text = text.substring(0, 100) + "...";
								$(this).text(text);
							});
						});
					}, 100);
					
					$('#db-view tbody').attr("data-type", "collection-view");
				},
				error: function(error){
					console.log(error);
					wmAlert("Что-то пошло не так... См. логи", "fail");
				}
			});
		}
		
		requestCollection();
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