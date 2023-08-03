FROM nginx:latest

WORKDIR /app
COPY package.json package-lock.json ./
COPY src src
COPY public public
COPY build build

# Configure the nginx inside the docker image
COPY .templates/nginx.conf /etc/nginx/conf.d/
COPY .templates/nginx.chut.conf /etc/nginx/conf.d/

# Add the root certificate SSL of the API
COPY .templates/ssl.crt /usr/local/share/ca-certificates/ssl.crt
RUN update-ca-certificates

# Entrypoint script is used to replace environment variables
COPY ./docker-entrypoint.sh /app
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
