FROM alpine:latest

RUN apk update && apk upgrade

# Install the relevant packages
RUN apk add wget libzip-dev bison autoconf alpine-sdk pkgconf git \
libltdl libbz2 libxml2-dev libssl1.1 libmcrypt-dev libressl-dev curl-dev

# Install pear for installing pthreads later.
RUN apk add php-pear

# The previous command will have installed PHP, so remove it
RUN apk del php-cli

WORKDIR /root
RUN wget https://github.com/php/php-src/archive/php-7.2.34.tar.gz

RUN tar --extract --gzip --file php-*
RUN rm php-*.tar.gz
RUN mv php-src-* php-src

WORKDIR /root/php-src
RUN ./buildconf --force


ENV CONFIGURE_STRING="--prefix=/etc/php7 \
--disable-cgi \
--disable-pdo \
--enable-sockets \
--enable-pcntl \
--enable-json \
--enable-simplexml \
--enable-cli \
--enable-maintainer-zts \
--enable-xml \
--with-openssl \
--with-pcre-regex \
--with-config-file-path=/etc/php7/cli \
--with-config-file-scan-dir=/etc/php7/etc \
--with-curl \
--with-tsrm-pthreads \
--without-sqlite3"
RUN ./configure $CONFIGURE_STRING

RUN make && make install

# Update the symlink for php to point to our custom build.
RUN rm /usr/bin/php

# Install pthreads
RUN chmod o+x /etc/php7/bin/phpize
RUN chmod o+x /etc/php7/bin/php-config

RUN git clone --depth 1 https://github.com/krakjoe/pthreads.git
WORKDIR /root/php-src/pthreads
RUN /etc/php7/bin/phpize

RUN ./configure \
--prefix='/etc/php7' \
--with-libdir='/lib/x86_64-linux-gnu' \
--enable-pthreads=shared \
--with-php-config='/etc/php7/bin/php-config'

RUN make && make install

# Set up our php ini 
RUN mkdir -p /etc/php7/cli/
RUN cp ~/php-src/php.ini-production /etc/php7/cli/php.ini

# Add the pthreads extension to the php.ini
RUN echo "extension=pthreads.so" | tee -a /etc/php7/cli/php.ini
RUN echo "zend_extension=opcache.so" | tee -a /etc/php7/cli/php.ini

RUN apk add jq

RUN for branchName in $(curl https://api.github.com/repos/zeko868/schedule-generator/branches | jq -r '.[].name'); do git clone --branch "$branchName" --depth 1 https://github.com/zeko868/schedule-generator.git /var/www/localhost/htdocs/$branchName; done;

ENV SWIPL_VERSION 8.3.28

WORKDIR /tmp

ADD https://www.swi-prolog.org/download/devel/src/swipl-${SWIPL_VERSION}.tar.gz .

RUN apk add --no-cache \
    build-base \
    zlib-dev \
    cmake \
 && tar zxf swipl-${SWIPL_VERSION}.tar.gz \
 && mkdir swipl-${SWIPL_VERSION}/build

WORKDIR /tmp/swipl-${SWIPL_VERSION}/build

RUN cmake \
    -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DCMAKE_VERBOSE_MAKEFILE=ON \
    -DSWIPL_PACKAGES_ODBC=OFF \
    -DSWIPL_PACKAGES_JAVA=OFF \
    -DSWIPL_PACKAGES_X=OFF \
    -DBUILD_TESTING=OFF \
    -DINSTALL_DOCUMENTATION=OFF \
    ..

RUN make -j$(nproc)

RUN make install

WORKDIR /

RUN \
    apk add --no-cache \
    apache2-proxy \
    apache2-ssl \
    apache2-utils \
    php7-apache2 \
    php7-curl \
    php7-json \
    php7-xmlreader \
    php7-session \
    logrotate \
    openssl

RUN rm /var/www/localhost/htdocs/index.html

RUN for repoName in $(ls -1 /var/www/localhost/htdocs/); do ln -s /var/www/localhost/htdocs/current/shared-data /var/www/localhost/htdocs/$repoName/shared-data; done

RUN sed 's/AllowOverride None/AllowOverride All/g' -i /etc/apache2/httpd.conf

RUN git clone https://github.com/ramlmn/Apache-Directory-Listing.git /tmp/apache-directory-listing

RUN cp -r /tmp/apache-directory-listing/directory-listing /var/www/localhost/htdocs/

RUN sed 's#{LISTING_DIRECTORY}#directory-listing#g' /tmp/apache-directory-listing/htaccess.txt | sed 's#{LISTING_STYLE}#grid#g' > /var/www/localhost/htdocs/.htaccess

RUN apk del php-pear build-base cmake wget libzip-dev bison autoconf alpine-sdk pkgconf git su-exec cmake readline-dev tar jq libc-utils scanelf musl-utils

RUN rm -rf /tmp/* /root/php-src

RUN ln -s /etc/php7/bin/php /usr/bin/php

RUN sed -i 's#^ErrorLog.*#ErrorLog /dev/stderr#g' /etc/apache2/httpd.conf

VOLUME [ "/var/www/localhost/htdocs/current" ]

CMD ["/usr/sbin/httpd", "-D", "FOREGROUND"]
