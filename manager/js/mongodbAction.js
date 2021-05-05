$(document).ready(function(){
	
	let current_db = $(".databases-list").find("li.active").text(); // Текущая база данных
	let current_collection; // Текущая коллекция
	let requestCollection; // Запрос текущей коллекции
	let dt; // Экземпляр таблицы для DataTable
	
	// Отображение коллекций базы данных при загрузке страницы
	function viewDB(){
		// Если уже инициализирован экземпляр таблицы, необходимо его удалить
		if($("#db-loading").css("display") == "none"){
			if($("#db-view tbody").length){
				dt.destroy();
				$('#db-view').html("");
			}
			$("#db-loading").css("display", "block");
		}
		
		// Установка названия текущей БД в заголовках
		$("#db-name").html("<span>" + current_db + "</span>");
		$("title").text("Weightless Manager | " + current_db);
		
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
	}
	
	viewDB();
	
	// Просмотр коллекции
	$("#db-view").on("click", "tbody[data-type='collections'] td", function(){
		current_collection = $(this).text().trim(); // Название коллекции для выборки из БД
		
		// Запрос коллекции
		requestCollection = function(){
			// Удаление текущей таблицы
			if($("#db-view").find("tbody").length) dt.destroy();
			$('#db-view').html("");
			$("#db-loading").css("display", "block");
			
			// Активация хлебной крошки к базе данных
			$("#db-name span").attr("id", "to-db").attr("style", "border-bottom: 1px dashed #d8d8d8; cursor: pointer;");
			$("#to-db").click(function(){
				if($("#editor").length){
					$(".responsive-table").parent().removeClass("editor_active");
					$(".responsive-table").removeClass("editor_active");
					editor.remove();
				}
				viewDB();
			});
			
			// Добавление названия коллекции и кнопки обновления к заголовкам
			$("#db-name")
				.append("<span id='current-col'> > <span>" + current_collection + "</span></span>")
				.append(" <i id='col-reload' class='fa fa-refresh' style='cursor:pointer;color:#d2d2d2;font-size:16px;'></i>");
			$("title").append(" > " + current_collection);
			
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
					
					// Обработка клика по кнопке перезагрузки таблицы
					$("#col-reload").click(function(){
						$("#current-col, #col-reload").remove();
						requestCollection();
					});
					
					$("#db-loading").css("display", "none");
					
					// Подготовка идентификаторов
					$.each(result.response.documents, function(id, val){
						// Если нет ObjectID, подготовка не нужна
						if(val._id.$oid){
							result.response.documents[id]["_id"] = val._id.$oid;
							result.response.documents[id]["Документ"] = JSON.parse(result.response.documents[id]["Документ"]);
							result.response.documents[id]["Документ"]["_id"] = result.response.documents[id]["_id"];
							result.response.documents[id]["Документ"] = JSON.stringify(result.response.documents[id]["Документ"]);
						}
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
						// Добавить документ
						$("#db-view_length").append(
							"<span id='add-document' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer; margin: 0 15px 0 15px;'>" +
							"Добавить документ" +
							"</span>"
						);
						
						// Удалить коллекцию
						$("#db-view_length").append(
							"<span id='drop-collection' class='text-danger' style='border-bottom:1px dashed #ff6656;cursor:pointer;'>" +
							"Удалить коллекцию" +
							"</span>"
						);
						
						$.each($("tbody tr"), function(){
							// Обрезка длинных JSON
							$($(this).find("td")[1]).text(function(i, text){
								if(text.length >= 120)
									text = text.substring(0, 120) + "...";
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
	
	$(".responsive-table").on("click", "#add-document", function(){
		// Удаление таблицы
		dt.destroy();
		$('#db-view').html("");
		$("#db-loading").css("display", "block");
		
		// Заголовки
		$("title").append(" > Новый документ");
		$("#col-reload").remove();
		$("#current-col span").attr("id", "to-col").attr("style", "border-bottom: 1px dashed #d8d8d8; cursor: pointer;");
		$("#db-name").append("<span id='current-doc'> > Новый документ</span>");
		
		// Активация хлебной крошки к коллекции
		$("#to-col").click(function(){
			if(!confirm("В редакторе остались несохраненные данные. Продолжить?")) return false;
			editor.toCollection();
		});
		
		// Подготовка редактора
		$(".responsive-table").parent().addClass("editor_active");
		$(".responsive-table").addClass("editor_active");
		$(".responsive-table").append("<div id='editor'></div>");
		let container = document.getElementById("editor");
		let options = {
			modes: ['code', 'text'],
			mode: 'code',
			ace: ace
		}
		let editor = new JSONEditor(container, options);
		editor.set({"_id": ""});
		
		$("#db-loading").css("display", "none");
		
		// Добавление кнопок управления
		$("#editor").prepend(
			"<button id='save-document' class='btn btn-round btn-success' style='float: left;'>Сохранить</button>" +
			"<button id='cancel-document' class='btn btn-round btn-default' style='margin: 0 0 10px 10px;'>Отмена</button>"
		);
		
		// Переход обратно в коллекцию
		editor.toCollection = function(){
			$("title").text("Weightless Manager | " + current_db);
			$(".responsive-table").parent().removeClass("editor_active");
			$(".responsive-table").removeClass("editor_active");
			$("#current-col, #current-doc").remove();
			$("#editor").remove();
			requestCollection();
		};
		
		// Отмена с переходом обратно в коллекцию
		$("#cancel-document").click(function(){
			if(!confirm("В редакторе остались несохраненные данные. Продолжить?")) return false;
			editor.toCollection();
		});
		
		$("#save-document").click(function(){
			let $this = $(this);
			$this.attr("id", "");
			$this.html("<i class='fa fa-spinner fa-pulse'></i>");
			
			try{
				let doc = editor.get();
				
				$.ajax({
					url: config.api_db_mongodb + "/newDocument",
					type: "POST",
					dataType: "json",
					headers: {
						"Authorization": "Bearer " + localStorage.getItem("user_token")
					},
					data: {
						"db": current_db,
						"collection": current_collection,
						"doc": JSON.stringify(doc),
						"iam-token": localStorage.getItem("IAM_token")
					},
					success: function(result){
						if(result.response.error){
							wmAlert(result.response.error, "fail");
							return false;
						}
						
						wmAlert("Документ успешно сохранен", "success");
						
						editor.toCollection();
					},
					error: function(error){
						wmAlert("Что-то пошло не так... См. логи", "fail");
						console.log(error);
					}
				});
			} catch(e){
				wmAlert("В документе присутствуют ошибки", "fail");
				console.log(e);
			}
		});
	});
	
	// Редактирование документа
	$("#db-view").on("dblclick", "tbody[data-type='collection-view'] td", function(){
		let $this = $(this);
		let _id = $this.index() == 0 ? $this.text() : $this.parent().find("td:eq(0)").text();
		
		// Удаление таблицы
		dt.destroy();
		$('#db-view').html("");
		$("#db-loading").css("display", "block");
		
		// Заголовки
		$("title").append(" > " + _id);
		$("#col-reload").remove();
		$("#current-col span").attr("id", "to-col").attr("style", "border-bottom: 1px dashed #d8d8d8; cursor: pointer;");
		$("#db-name").append("<span id='current-doc'> > " + _id + "</span>");
		
		// Активация хлебной крошки к коллекции
		$("#to-col").click(function(){
			editor.toCollection();
		});
		
		// Подготовка редактора
		$(".responsive-table").parent().addClass("editor_active");
		$(".responsive-table").addClass("editor_active");
		$(".responsive-table").append("<div id='editor'></div>");
		let container = document.getElementById("editor");
		let options = {
			modes: ['code', 'text'],
			mode: 'code',
			ace: ace
		}
		let editor = new JSONEditor(container, options);
		
		// Переход обратно в коллекцию
		editor.toCollection = function(){
			$("title").text("Weightless Manager | " + current_db);
			$(".responsive-table").parent().removeClass("editor_active");
			$(".responsive-table").removeClass("editor_active");
			$("#current-col, #current-doc").remove();
			$("#editor").remove();
			requestCollection();
		};
		
		// Получение документа
		$.ajax({
			url: config.api_db_mongodb + "/document",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"collection": current_collection,
				"_id": _id,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				// Подготовка идентификаторов
				let doc = JSON.parse(result.response.document);
				if(doc["_id"]["$oid"]) doc["_id"] = doc["_id"]["$oid"];
				editor.set(doc);
				
				$("#db-loading").css("display", "none");
				
				// Добавление кнопок управления
				$("#editor").prepend(
					"<button id='save-document' class='btn btn-round btn-success' style='float: left;'>Сохранить</button>" +
					"<button id='cancel-document' class='btn btn-round btn-default' style='margin: 0 0 10px 10px;'>Отмена</button>" +
					"<button id='remove-document' class='btn btn-round btn-danger' style='float: right;'>Удалить документ</button>"
				);
				
				// Сохранение документа
				$("#save-document").click(function(){
					let $this = $(this);
					$this.attr("id", "");
					$this.html("<i class='fa fa-spinner fa-pulse'></i>");
					
					try{
						let updated = editor.get();
						
						$.ajax({
							url: config.api_db_mongodb + "/updateDocument",
							type: "POST",
							dataType: "json",
							headers: {
								"Authorization": "Bearer " + localStorage.getItem("user_token")
							},
							data: {
								"db": current_db,
								"collection": current_collection,
								"_id": _id,
								"updated": JSON.stringify(updated),
								"iam-token": localStorage.getItem("IAM_token")
							},
							success: function(result){
								if(result.response.error){
									wmAlert(result.response.error, "fail");
									return false;
								}
								
								wmAlert("Документ успешно сохранен", "success");
								
								$this.attr("id", "save-document");
								$this.html("Сохранить");
							},
							error: function(error){
								wmAlert("Что-то пошло не так... См. логи", "fail");
								console.log(error);
							}
						});
					} catch(e){
						wmAlert("В документе присутствуют ошибки", "fail");
						console.log(e);
					}
				});
				
				// Удаление документа из редактора
				$("#remove-document").click(function(){
					if(!confirm("Подтвердите удаление")) return false;
					
					$(this).attr("id", "");
					$(this).html("<i class='fa fa-spinner fa-pulse'></i>");
					
					$.ajax({
						url: config.api_db_mongodb + "/removeDocument",
						type: "POST",
						dataType: "json",
						headers: {
							"Authorization": "Bearer " + localStorage.getItem("user_token")
						},
						data: {
							"db": current_db,
							"collection": current_collection,
							"_id": _id,
							"iam-token": localStorage.getItem("IAM_token")
						},
						success: function(result){
							if(result.response.error){
								wmAlert(result.response.error, "fail");
								return false;
							}
							
							editor.toCollection();
						},
						error: function(error){
							wmAlert("Что-то пошло не так... См. логи", "fail");
							console.log(error);
						}
					});
				});
				
				// Отмена с переходом обратно в коллекцию
				$("#cancel-document").click(function(){
					editor.toCollection();
				});
			},
			error: function(error){
				wmAlert("Что-то пошло не так... См. логи", "fail");
				console.log(error);
			}
		});
	});
	
	// Удаление документа
	$(".responsive-table").on("click", ".remove-row", function(){
		if(!confirm("Подтвердите удаление")) return false;
		
		$(this).removeClass("fa-close").addClass("fa-spinner fa-pulse");
		let $this = $(this);
		
		// Удаление строки из таблицы БД
		$.ajax({
			url: config.api_db_mongodb + "/removeDocument",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"collection": current_collection,
				"_id": $(this).parent().text(),
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
				wmAlert("Что-то пошло не так... См. логи", "fail");
				console.log(error);
			}
		});
	});
	
	// Удаление коллекции
	$(".responsive-table").on("click", "#drop-collection", function(){
		if(!confirm("Подтвердите удаление")) return false;
		
		$(this).text("").css("border", "none").addClass("fa fa-spinner fa-pulse");
		
		// Удаление коллекции из БД
		$.ajax({
			url: config.api_db_mongodb + "/deleteCollection",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"collection": current_collection,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				wmAlert("Коллекция " + current_collection + " успешно удалена", "success");
				
				viewDB();
			}
		});
	});
	
});