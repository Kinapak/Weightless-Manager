# Weightless Manager
 Простой и легкий редактор баз данных с облачным компонентом.

# Установка и настройка
## App ID
1. На вкладке Manage Authentication > Identity Providers выключить все, кроме Cloud Directory.
2. На вкладке Manage Authentication > Authentication Settings добавить адреса для редиректа (напр., https://wm.test).
3. На вкладке Cloud Directory > Settings установить: Email and password, yes, yes
4. На вкладке Applications создать приложение, указав домен без протокола, затем добавить Scope с тем же доменом.
5. Для каждого приложения создать две роли: WM_домен_access_manager и WM_домен_access_user для администратора и пользователей приложения соответственно, указав Scope домен/домен.
6. На вкладке Cloud Directory > Users создать пользователя.
7. После создания пользователя в выпадающем меню назначить ему роль администратора приложения.
8. На вкладке Service Credentials создать запись для дальнейших проверок ролей.
9. Поля ключа апи и tenant_id добавить в конфигурации.
10. Кастомизировать страницу логина на вкладке Login Customization:

        Название вкладки: Weightless Manager | Вход
        HEX шапки: #a7ccdf

## Cloudant
1. Создать базу данных app_db с типом Non-Partitioned.
2. Создать документ приложения, содержащий JSON:

        "_id": "домен",
        "databases": {}
        
3. Создать базу данных applications с типом Non-Partitioned.
4. Создать документ приложения, содержащий JSON:

        "_id": "домен",
        "credits": 100,
        "keys": {}
        
5. На вкладке Account > Settings скопировать External Endpoint в конфиги. Например:

        $cloudant_url = "https://aa5c968d-2972-4175-b569-700a1328047f-bluemix.cloudant.com";

6. На вкладке Service Credentials создать две записи: для чтения и записи в Cloudant. Скопировать ключи апи в конфиги.
7. В настройках аккаунта в разделе Access (IAM) > Service IDs на вкладке Access policies создать записи с полномочиями Reader для чтения и Reader, Writer для записи с указанием Service Instance App ID.

## Object Storage
Используется для хранения текстовых документов (.txt) с логами приложений. Для каждого приложения создается свой отдельный bucket.\
Настройка:
1. На вкладке Service Credentials создать запись с полномочиями Object Writer, параметр HMAC поставить On, затем для данной записи в настройках Access (IAM) дополнительно выставить полномочия Object Reader. Скопировать ключ апи в конфиг сервиса логирования.
2. На вкладке Enpoints выбрать тип Regional, регион eu-gb и скопировать URL-адрес типа Public в конфиг в переменную logs_url.
3. Создать bucket для приложения с именем: weightlessmanager-logs-домен. Выбрать регион eu-gb, стандартный план.

## config.json
Конфигурация приложения с адресами доступных апи и параметрами приложения из App ID.

    {
    	"api_user_login": "",
    	"api_db_management": "",
    	"api_db_mysql": "",
    	"api_db_redis": "",
    	"api_db_mongodb": "",
    	"api_app_management": "",
    	"tenant": "tenantId",
    	"app_id": "clientId",
    	"secret": "secret",
    	"domain": "домен",
    	"version": "текущая версия"
    }
    
## CDN
1. На удаленном CDN-сервере выкладываются папки с версиями приложения, в т. ч. текущей, в формате vX.Y.Z (напр., v1.0.0). В них содержатся папки assets и manager, где лежат скрипты для подключения на клиенте, а также html-файлы с доступными страницами.
2. Рядом с папками версий выкладывается файл .htaccess с настройками CORS:

        Header add Access-Control-Allow-Origin "*"
        Header add Access-Control-Allow-Methods: "GET,POST,OPTIONS,DELETE,PUT"
        
3. Файл apis.json содежит информацию о доступных апи, а также может содержать другую информацию, например:

        {
            "api_user_login": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/user/login",
            "api_db_management": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/database/management",
            "api_db_mysql": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/database/mysql",
            "api_db_redis": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/database/redis",
            "api_db_mongodb": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/database/mongodb",
            "api_app_management": "https://service.eu.apiconnect.ibmcloud.com/gws/apigateway/api/398890224bb2bbd3b2bbe55d1f150f2e18f4db8b239d431e80f44a3052dab385/app/management",
            "tenant": "99f870dc-02ac-4082-812e-f9a271bcd35d"
        }
        
4. Файл version.php содержит текущую версию:

        <?php
            echo "v0.4.0";
            
## API
Все апи должны быть настроены для авторизации через App ID, исключая user_login. Настройки каждого API-интерфейса, операции и пути см. ниже.

### user_login
![user_login](https://russiabase.ru/wm/docs/api_img/user_login.png)

### app_management
![app_management](https://russiabase.ru/wm/docs/api_img/app_management.png)

### database_management
![database_management](https://russiabase.ru/wm/docs/api_img/database_management.png)

### database_mysql
![database_mysql](https://russiabase.ru/wm/docs/api_img/database_mysql.png)

### database_redis
![database_redis](https://russiabase.ru/wm/docs/api_img/database_redis.png)

### database_mongodb
![database_mongodb](https://russiabase.ru/wm/docs/api_img/database_mongodb.png)

### wm_logs
![wm_logs](https://russiabase.ru/wm/docs/api_img/wm_logs.png)

## Установка приложения
Для установки на сервер необходимо создать отдельную директорию под административную панель.\
Внутри должна находится директория manager, содержащая index.html - главную страницу панели. Также внутрь помещаются: config.json с конфигурацией приложения из App ID и адресами API, updater.php для обновления приложения (при наличии модуля PHP на сервере) и файл .htaccess.\
Файл .htaccess содержит правила роутинга файлов и т.д.:

    AddDefaultCharset utf-8
    RemoveHandler .pl
    AddType application/x-httpd-php .asp .shtml .html .htm .pl
    
    RewriteEngine On
    
    RewriteRule ^$ manager/index.html [QSA,L]
    
    RewriteCond %{THE_REQUEST} %
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^(.+)$ manager/index.html [QSA,L]
    
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^([^\.]+)$ manager/index.html [QSA,L]
    
После этого конфигурируются App ID и Cloudant для нового приложения.
