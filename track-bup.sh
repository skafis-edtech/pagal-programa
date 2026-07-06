#!/bin/bash

TODAY_DATE=$(date +%F)

cd /home/home/Desktop/PLAYGROUND/pagal-programa/bup-content
python3 track.py
git add .
git commit -m "$TODAY_DATE bup content"
git push
