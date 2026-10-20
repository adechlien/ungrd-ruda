import { writeFileSync } from 'node:fs';
import { readJson } from './db.mjs';
import { SECTION_SCHEMAS } from './generated/contract.mjs';
const maps=readJson('./field-map.json');let sql='-- Dominios de respuesta del formulario. NULL significa sin responder.\n';
for(const [table,fields] of Object.entries(maps))for(const [column,key] of Object.entries(fields)){
 const [,section,id]=key.match(/^section-(\d+)-(.+)$/);const f=SECTION_SCHEMAS[Number(section)-1].groups.flatMap(g=>g.fields).find(f=>f.id===id);
 if(f?.options)sql+=`ALTER TABLE ${table} ADD CHECK (${column} IS NULL OR ${column} IN (${f.options.map(v=>"'"+v.replaceAll("'","''")+"'").join(',')}));\n`;
}
sql+=`ALTER TABLE pregunta_guia ADD UNIQUE(codigo,grupo_evento);
ALTER TABLE pregunta_guia_respuesta ADD FOREIGN KEY(pregunta_codigo,categoria_evento) REFERENCES pregunta_guia(codigo,grupo_evento);
ALTER TABLE usuario ADD CHECK (correo = lower(correo));
ALTER TABLE declaracion ADD CHECK (jsonb_typeof(datos_declarados) = 'object');
`;
writeFileSync('server/migrations/002_response_domains.sql',sql);
console.log('Dominios SQL generados.');
