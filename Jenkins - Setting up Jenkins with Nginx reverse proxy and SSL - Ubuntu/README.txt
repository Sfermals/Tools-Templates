# Setting up Jenkins with Nginx reverse proxy and SSL - Debian



## Setup a Jenkins instance

1. Install JDK

`sudo apt update`
`sudo apt install default-jdk`


2. Add the repository key to your system:

`wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key |sudo gpg --dearmor -o /usr/share/keyrings/jenkins.gpg`

   
   Next, let’s append the Debian package repository address to the server’s sources.list:
   
`sudo sh -c 'echo deb [signed-by=/usr/share/keyrings/jenkins.gpg] http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'`


3. Install the package

`sudo apt update`
`sudo apt install jenkins`

4. Start and enable

`sudo systemctl enable jenkins`
`sudo systemctl start jenkins`

5. Setup jenkins
   
   - type in browser: <server-ip>:8080
   
   - Jenkins generates a random password by default. Get the password:
   
`sudo cat /var/lib/jenkins/secrets/initialAdminPassword`
   
 In the getting started: UNLOCK JENKINS page 
   
   - copy & paste password under Administrator's password
   
   - Next, install suggested plugin
   
6. Create the admin user


## Configuring Nginx reverse proxy


1. Install Nginx

> sudo apt update
> sudo apt install nginx

2. Create nginx configuration file (change `sfermals.app` to your domain)

`vim /etc/nginx/sites-enabled/sfermals.app`

- In vim, fill in with the following:  (change `sfermals.app` to your domain)


	server {
		listen 80;
		server_name sfermals.app;

		location / {
			include /etc/nginx/proxy_params;
			proxy_pass          http://localhost:8080;
			proxy_read_timeout  60s;
			# Fix the "It appears that your reverse proxy set up is broken" error.
			# Make sure the domain name is correct
			proxy_redirect      http://localhost:8080 https://sfermals.app;
		}
	}


2. Verify the config and restart nginx

`nginx -t`
`sudo systemctl restart nginx`



3. Change Jenkins bind address

- By default Jenkins listens on all network interfaces. 

- But we need to disable it because we are using Nginx as a reverse proxy
  and there is no reason for Jenkins to be exposed to other network interfaces.
  
`vim /etc/default/jenkins`

- Locate the line starting with `JENKINS_ARGS` (It’s usually the last line) 
  and append as per the following:

`JENKINS_ARGS="--webroot=/var/cache/$NAME/war --httpPort=$HTTP_PORT --httpListenAddress=127.0.0.1"`



4. Change Jenkins bind address

`sudo systemctl restart jenkins`
`sudo systemctl status jenkins`

If output says Jenkins active & running fine  it should load now, but on http only.





## Setup SSL

1. Install certbot
Certbot - Let’s us fetch SSL certificates from Let’s Encrypt python3-certbot-nginx - Helps us configure Nginx SSL config

`sudo apt install certbot python3-certbot-nginx`

2. Verify that the domains are pointing to our server IP

`dig sfermals.app +short`
`dig www.sfermals.app +short`

it should return us our ec2 instance's ip.

3. Create letsencrypt.conf

- Remember, the LetsEncrypt certificates are valid only for 90 days. That means, we need to renew them regularly.

- This conf is needed so that when letsencrypt tries to renew the certificate,
  it can access the domain over http without being redirected.

- That is, without this conf, if we are redirecting all http to https,
  then even the letsencrypt renewal requests too will get redirected, causing the renewal to fail

4. Create "letsencrypt.conf"

`vim /etc/nginx/snippets/letsencrypt.conf`

----
location ^~ /.well-known/acme-challenge/ {
    default_type "text/plain";
    root /var/www/letsencrypt;
}
----

4. Create this directory

`mkdir /var/www/letsencrypt`



5. Include letsencrypt in /etc/nginx/sites-enabled/sfermal.app

`vim /etc/nginx/sites-enabled/sfermal.app`

----
server {
    listen 80;
	
	include /etc/nginx/snippets/letsencrypt.conf;
	
    server_name sfermals.app;

	location / {
		include /etc/nginx/proxy_params;
		proxy_pass          http://localhost:8080;
		proxy_read_timeout  60s;
        # Fix the "It appears that your reverse proxy set up is broken" error.
        # Make sure the domain name is correct
		proxy_redirect      http://localhost:8080 https://sfermals.app;
	}
}
----

6. Verify and reload nginx

`nginx -t`
`sudo systemctl reload nginx`


7. Fetch the Certificate

`sudo certbot --nginx -d sfermals.app -d www.sfermals.app`

Make sure to give the proper domain names.

If everything went well, you should see something like: (Please note that I chose not to setup a redirect from HTTP to HTTPS)


output: 

---
> certbot --nginx -d sfermals.app -d www.sfermals.app
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Plugins selected: Authenticator nginx, Installer nginx
Obtaining a new certificate
Performing the following challenges:
http-01 challenge for sfermals.app
http-01 challenge for www.sfermals.app
Waiting for verification...
Cleaning up challenges
Deploying Certificate to VirtualHost /etc/nginx/sites-enabled/sfermals.app
Deploying Certificate to VirtualHost /etc/nginx/sites-enabled/sfermals.app

Please choose whether or not to redirect HTTP traffic to HTTPS, removing HTTP access.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
1: No redirect - Make no further changes to the webserver configuration.
2: Redirect - Make all requests redirect to secure HTTPS access. Choose this for
new sites, or if you're confident your site works on HTTPS. You can undo this
change by editing your web server's configuration.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Select the appropriate number [1-2] then [enter] (press 'c' to cancel): 1

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Congratulations! You have successfully enabled https://sfermals.app and
https://www.sfermals.app

You should test your configuration at:
https://www.ssllabs.com/ssltest/analyze.html?d=sfermals.app
https://www.ssllabs.com/ssltest/analyze.html?d=www.sfermals.app

---


At this point, you should have the certificates in place. Your nginx conf will look similar to this:

`cat /etc/nginx/sites-enabled/sfermal.app`


----
server {
    listen 80;

    include /etc/nginx/snippets/letsencrypt.conf;

    server_name ssl.demo.esc.sh www.sfermals.app;

    root /var/www/sfermals.app;
    index index.html;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/sfermals.app/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/sfermals.app/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot


}
----


8. (Optional) - Redirect HTTP to HTTPS
It is recommended that you enable HTTP to HTTPS redirection Edit the nginx conf and make it look like this

`vim /etc/nginx/sites-enabled/sfermal.app`

----
server {
    listen 80;

    include /etc/nginx/snippets/letsencrypt.conf;

    server_name ssl.demo.esc.sh www.sfermals.app;

    # We are redirecting all request to port 80 to the https server block
    location / {
       return 301 https://$host$request_uri;
    }
}
server {

    listen 443 ssl; # managed by Certbot

    ssl_certificate /etc/letsencrypt/live/sfermal.app/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/sfermal.app/privkey.pem; # managed by Certbot

    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    server_name sfermal.app www.sfermal.app;

    root /var/www/sfermal.app;
    index index.html;
}
----


9. Enable auto renew

Let’s Encrypt certificates expire in 90 days. 
So we need to make sure that we renew them much before. 

Renewal is done by using the command:

`certbot renew`

Add it as a cron so that it runs every 30 days or so.

Press `crontab -e` to edit the crontab. 
If you are non-root user, do `sudo crontab -e`

Add the following lines:
 
----
30 2 * * 1 /usr/bin/certbot renew >> /var/log/certbot_renew.log 2>&1
35 2 * * 1 /etc/init.d/nginx reload
----

The first one renews the certificate and the second one reloads nginx These runs once a month at 2.30AM and 2.35AM respectively




10. Update the nginx config to look like this

`vim /etc/nginx/sites-enabled/sfermal.app`

----
server {
    listen 80;
    server_name sfermal.app;

	location / {
        return 301 https://$host$request_uri;
	}
}

server {
    listen 443 ssl;

    server_name sfermal.app;

    ssl_certificate /etc/letsencrypt/live/sfermal.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sfermal.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;


    
	location / {
		include /etc/nginx/proxy_params;
		proxy_pass          http://localhost:8080;
		proxy_read_timeout  60s;
        # Fix the "It appears that your reverse proxy set up is broken" error.
        # Make sure the domain name is correct
		proxy_redirect      http://localhost:8080 https://sfermal.app;
	}
}
----

11. Make sure nginx is alright & reload nginx

`nginx -t`

`sudo systemctl reload nginx`


Thats it!, Jenkins is up and ready configured with SSL certificate! 
Go ahead & go to browser and type domain url to access jenkins.