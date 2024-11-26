# PhotoDB

## Demo

tl;dr (just tell me how to run demo)

- clone the repository
- `cd demo`
- `docker-compose build` (it may take a while when you build images for the first time)
- `docker-compose up loader` (and wait until it finishes)
- `docker-compose up -d` (and wait a bit - a minute or two - until indexer finishes processing sample photos included in the demo setup)

Then open http://localhost:8067/ in your browser and enjoy PhotoDB.

You will need Docker (preferably [Docker Desktop](https://www.docker.com/products/docker-desktop/)).

See more in [DEMO.md](demo/DEMO.md).

## Screenshots

![PhotoDB - screenshot 1](doc/PhotoDB-screenshot1.png?raw=true "PhotoDB")
![PhotoDB - screenshot 2](doc/PhotoDB-screenshot2.png?raw=true "PhotoDB")

## What is PhotoDB

PhotoDB helps you (and your friends/family) to deal with constantly increasing number of photos made every day and worth keeping.
Typical scenario I find myself in is:

- on a trip or other occasion, make a lot of photos
- when back at home, download them to NAS drive
- hope that will have time to browse them and select these worth keeping / best one (e.g. for making paper copies),

And guess what - this is really hard. Or rather it was, before I decided to write PhotoDB to help me :)

## Why yet another photo gallery?

There are tons of photo galleries out there, some of them even open source, some of them really good.
But I haven't found one that would satisfy all my unique set of requirements:

- self hosted (cloud is a no-go for private photos, at least for me)
- allows to index photos from read only drives (my NAS is by default works in RO mode, to prevent accidental data loss)
- allows many users to contribute (e.g. mark favorites)
- uses thumbnails (for faster operation - originals are huge!) stored in different location than originals (again, my NAS works in RO mode)
- keeps tags/favorites saved in database, that can be shared between users
- allows to flexible scale thumbnails in gallery - to balance between number fo photos visible at once and level of details visible
- uses as many tags as needed, with custom icons
- in gallery, when browsing favorites, allows to quickly locate "siblings" (photos taken at the same time)

All the above requirements are implemented in PhotoDB.

## How does it work?

The solution is composed of:

- simple database (SQLite)
- indexer service, implemented in C# (.net core)
- web api service, implemented in C# (.net core)
- web client (implemented in TypeScript with React, build with vite)

### Indexer

Indexer service runs as a service (24/7) and monitors given set of folders (provided in configuration).
All supported files are automatically indexed i.e. thumbnail is generated and stored in special folder and additionally an entry is saved in the database.

### Web API

Runs as a service and allows web client to query database and load thumbnails/photos (so need to have access to these folders)

### Web client

Web client can be hosted as set of static files on any web server (apache, nginx) or from docker.

## Installation

The easiest way to install PhotoDB is to clone the demo configuration (see folder `demo`) and adjust configuration to your needs. Especially, instead of docker volume containing sample photos, you may want to attach (and expose to docker containers) your real folder containing photos. Please remember to adjust config files in subfolders accordingly.

## Ideas for the future

### Indexer

- more flexible way to configure monitored folders
- make sure indexer work recursively (all subfolders of the given folder)
- save dominant color for thumbnail
- index photos from other sources than file system
- more mature database rather than SQLite
- configurable plugins to perform automatic indexing and tag assignment:
  - AI to describe image
  - detect whether rotation information is correct
  - attach keywords
  - detect people faces
  - automatically assign some tags (e.g. "paris")
  - derive tags from folder path
  - derive tags from file date / exif / etc.

### API

- saving history of actions (e.g. who and when added/removed tag)
- expose configuration of custom tags

### Web

- skeletons when loading photos
- when switching page, reset scroll position
- light box for pictures
- hide icons (tags etc.) when thumbnail too small (scaling make no sense, doesn't it?)
- make photos "selectable" and present details of selected photo in a frame somewhere
- ad-hoc zooming (especially on mobile)
- separate page for kiosk mode like gallery, that automatically switches every X minutes
  (filtering panel can be opened and settings are stored in local storage)
- pre-filter (use server-side filtering) to improve performance
