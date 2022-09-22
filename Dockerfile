#
# WARNING: this Docker file is not tested with the current askbot-setup script.
# most likely at least this file will need to be adapted to make it work.
# if you can help - please make explain what you want to do in the issues
# section of the repository and once your contribution is accepted - make a pull request.
#
#----------------------------------------------------
# This Dockerifle builds a simple Askbot installation
#
# It makes use of environment variables:
# 1. DATABASE_URL See https://github.com/kennethreitz/dj-database-url for details
# 2. SECRET_KEY for making hashes within Django.
# 3. ADMIN_PASSWORD used for creating a user named "admin"
# 4. NO_CRON set this to "yes" to disable the embedded cron job.
#
# Make sure to *+always* start the container with the same SECRET_KEY.
#
# Start with something like
#
# docker run -e 'DATABASE_URL=sqlite:////askbot-site/askbot.db' -e "SECRET_KEY=$(openssl rand 14 | base64)" -e ADMIN_PASSWORD=admin -p 8080:80 askbot/askbot:latest
#
# User uploads are stored in **/askbot_site/askbot/upfiles** . I'd recommend to make it a kubernetes volume.

FROM tiangolo/uwsgi-nginx:python3.8-alpine

ARG SITE=askbot_app
ENV PYTHONUNBUFFERED 1
ENV ASKBOT_SITE /app/${SITE}

ENV UWSGI_INI /app/${SITE}/uwsgi.ini
# Not recognized by uwsgi-nginx, yet.
# The file doesn't exist either!
#ENV PRE_START_PATH /${SITE}/prestart.sh

# TODO: changing this requires another cache backend
ENV NGINX_WORKER_PROCESSES 1
ENV UWSGI_PROCESSES 1
ENV UWSGI_CHEAPER 0

ADD askbot_requirements.txt /

#RUN apt-get update && apt-get -y install cron git \
RUN apk add --update --no-cache git py3-cffi \
	gcc g++ git make unzip mkinitfs kmod mtools squashfs-tools py3-cffi \
	libffi-dev linux-headers musl-dev libc-dev openssl-dev \
	python3-dev zlib-dev libxml2-dev libxslt-dev jpeg-dev \
        postgresql-dev zlib jpeg libxml2 libxslt postgresql-libs \
    && python -m pip install --upgrade pip \
    && pip install -r /askbot_requirements.txt \
    && pip install psycopg2

ADD ./askbot_site /app
# RUN cd /src/ && python setup.py install
# RUN askbot-setup --db-engine postgresql -u postgres -p askbotPW --db-host=postgres --db-port=5432
# RUN askbot-setup -e postgresql --db-name askbot -u postgres -p askbotPW --db-host=postgres --db-port=5432 
# RUN askbot-setup -n /${SITE} -e postgresql --db-name askbot -u postgres -p askbotPW --db-host=postgres --db-port=5432 --logfile-name=stdout --no-secret-key --create-project container-uwsgi
# && askbot-setup -n /${SITE} -e 1 -d postgres -u postgres -p askbotPW --db-host=postgres --db-port=5432 --logfile-name=stdout --no-secret-key --create-project container-uwsgi

# RUN cp /src/askbot/container/prestart.sh /app

RUN mkdir -p /app/log
RUN mkdir -p /app/static
RUN mkdir -p /app/upfiles

RUN true \
    && cp /app/askbot/container/prestart.* /app \
    && /usr/bin/crontab /app/askbot/container/crontab \
    && cd /app && SECRET_KEY=whatever DJANGO_SETTINGS_MODULE=askbot_app.settings python manage.py collectstatic --noinput

# RUN true \
#     && cp /${SITE}/askbot_app/prestart.sh /app \
#     && /usr/bin/crontab /${SITE}/askbot_app/crontab \
#     && cd /${SITE} && SECRET_KEY=whatever DJANGO_SETTINGS_MODULE=askbot_app.settings python manage.py collectstatic --noinput

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.5.0/wait /wait
RUN chmod +x /wait

# WORKDIR /${SITE}
WORKDIR /app
