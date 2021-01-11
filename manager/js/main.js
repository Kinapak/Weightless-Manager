setTimeout(function(){
	
	// Загрузка списка баз данных в меню
	function dbList(){
		let $databases = $("#databases");
		
		$.ajax({
			url: config.api_db_management + "/list",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"user-token": localStorage.getItem("user_token"),
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(!result.databases) return false;
				
				$databases.html("");
				$.each(result.databases, function(id, val){
					$databases.append("<li><a href='views/database.html'>" + id + "</a></li>");
				});
				
				$databases.parent().children(".tree-toggle").trigger("click");
			},
			error: function(result){
				// Если ошибка, то вывод ошибки и логов
				console.log(result);
				
				$databases.html("");
				$databases.append("<li><a href='#'>ОШИБКА! См. логи</a></li>");
			}
		});
	}
	
	dbList();
	
	// Подгрузка страниц
	$(document).on("click", ".tree a", function(e){
		e.preventDefault();
		
		/* Дополнительная проверка токена перед подгрузкой страниц
		* Особенно важно, когда на странице совершаются действия, для которых нужен валидный токен */
		checkToken();
		
		$("#main-view").load("/manager/" + $(this).attr("href"));
		
		$(".ripple a").removeClass("active");
		$(this).closest(".ripple").children("a").addClass("active");
		$(".tree li").removeClass("active");
		$(this).parent().addClass("active");
	});
	
}, 500);