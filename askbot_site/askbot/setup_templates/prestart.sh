#!/usr/bin/env bash

if [ -x /wait ]; then /wait; else sleep 64; fi

python ${ASKBOT_SITE}/askbot_app/prestart.py

if [ -z "$NO_CRON" ]; then
    crond || cron
fi

