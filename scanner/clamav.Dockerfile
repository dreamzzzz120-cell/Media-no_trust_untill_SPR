FROM clamav/clamav:1.4

USER root

RUN mkdir -p /run/clamav /var/lib/clamav && chown -R clamav:clamav /run/clamav /var/lib/clamav

COPY scanner/clamav-start.sh /usr/local/bin/media-clamav-start
RUN chmod 0755 /usr/local/bin/media-clamav-start

ENTRYPOINT ["/usr/local/bin/media-clamav-start"]
