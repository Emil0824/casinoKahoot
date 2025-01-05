# Before running

`npm install`

create a file called `stack.env` with the following value:
`PUBLIC_URL="https://YOUR_URL_HERE"`


# Docker

`docker compose up --build`

# Node JS

`node .`

# Tailwind

Run this in seperate terminal when developing. It will check for changes
in files and update the output CSS.

`npx tailwindcss -i ./static/input.css -o ./static/output.css --watch`