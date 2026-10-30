#!/bin/sh
set -eu

case "${1:-}" in
  backup)
    umask 077
    file="/backups/ruda-$(date -u +%Y%m%dT%H%M%SZ).dump"
    (set -C; : > "$file") || exit 1
    trap 'rm -f "$file"' EXIT HUP INT TERM
    pg_dump --format=custom --file="$file"
    trap - EXIT HUP INT TERM
    printf 'Respaldo creado: %s\n' "$file"
    ;;
  restore)
    case "${RESTORE_DATABASE:-}" in
      ruda_restore_*) ;;
      *) echo 'RESTORE_DATABASE debe empezar por ruda_restore_ y ser una base nueva.' >&2; exit 1 ;;
    esac
    case "$RESTORE_DATABASE" in
      *[!a-z0-9_]*) echo 'Nombre de base no valido.' >&2; exit 1 ;;
    esac
    case "${RESTORE_FILE:-}" in
      ''|*/*|*\\*|.*) echo 'RESTORE_FILE debe ser el nombre del archivo .dump dentro de backups.' >&2; exit 1 ;;
    esac
    test -f "/backups/$RESTORE_FILE"
    pg_restore --list "/backups/$RESTORE_FILE" > /dev/null
    # Falla si el destino existe: nunca vacia una base existente.
    createdb -- "$RESTORE_DATABASE"
    pg_restore --dbname="$RESTORE_DATABASE" --no-owner --no-acl --exit-on-error --single-transaction "/backups/$RESTORE_FILE"
    printf 'Respaldo restaurado en: %s\n' "$RESTORE_DATABASE"
    ;;
  *) echo 'Uso: database-tools.sh backup|restore' >&2; exit 1 ;;
esac
