FROM node:9.2-alpine

WORKDIR /app

COPY . .

RUN rm -rf screenshots/

RUN npm install --production

RUN apk --no-cache add openssl

RUN sh generate-cert.sh

ENV JWT_HEADER ""
ENV FORWARD_HEADERS ""
ENV ECHO_TO_BODY "true"
ENV ECHO_TO_LOG "true"

EXPOSE 80 443


ENTRYPOINT ["node", "./index.js"]
CMD []
