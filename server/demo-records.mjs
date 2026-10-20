export function demoSeeds(SECTION_SCHEMAS) {
    const people = [
        ['María', 'González'],
        ['Carlos', 'Rodríguez'],
        ['Ana', 'Martínez'],
        ['Luis', 'García'],
        ['Diana', 'López'],
        ['Jorge', 'Pérez'],
        ['Sandra', 'Torres'],
        ['Pedro', 'Ramírez'],
        ['Lucía', 'Moreno'],
        ['Andrés', 'Castro'],
        ['Camila', 'Rojas'],
        ['Felipe', 'Vargas'],
        ['Valentina', 'Herrera'],
        ['Sebastián', 'Muñoz'],
        ['Natalia', 'Sánchez'],
        ['Mateo', 'Romero'],
        ['Laura', 'Gómez'],
        ['Nicolás', 'Medina'],
        ['Juliana', 'Ortiz'],
        ['Santiago', 'Ruiz'],
        ['Paula', 'Mendoza'],
        ['Diego', 'Hernández'],
    ];
    const scenarios = [
        ...Array(3).fill({ selectedEvent: 'flood', principal: 'Inundación', department: 'Antioquia', municipality: 'Medellín', eventDate: '2026-05-01' }),
        ...Array(3).fill({ selectedEvent: 'landslide', principal: 'Movimientos en masa', department: 'Antioquia', municipality: 'Medellín', eventDate: '2026-04-12' }),
        ...Array(3).fill({ selectedEvent: 'flood', principal: 'Inundación', department: 'Bogotá D.C.', municipality: 'Bogotá', eventDate: '2026-03-18' }),
        ...Array(3).fill({ selectedEvent: 'evacuation', principal: 'Amenaza de ruina o inminencia de colapso de edificaciones', department: 'Bogotá D.C.', municipality: 'Bogotá', eventDate: '2026-02-07' }),
        ...Array(3).fill({ selectedEvent: 'fire', principal: 'Incendio forestal', department: 'Valle del Cauca', municipality: 'Cali', eventDate: '2026-01-24' }),
        ...Array(3).fill({ selectedEvent: 'flood', principal: 'Inundación', department: 'Valle del Cauca', municipality: 'Cali', eventDate: '2025-12-09' }),
        ...Array(2).fill({ selectedEvent: 'landslide', principal: 'Movimientos en masa', department: 'Meta', municipality: 'Villavicencio', eventDate: '2025-11-16' }),
        ...Array(2).fill({ selectedEvent: 'fire', principal: 'Incendio forestal', department: 'Meta', municipality: 'Villavicencio', eventDate: '2025-10-28' }),
    ];
    return people.map(([name, surname], index) => {
        const id = `RUDA-2026-${String(120 + index).padStart(4, '0')}`;
        const completed = index % 3 !== 0;
        const scenario = scenarios[index];
        const selectedEvent = scenario.selectedEvent;
        const date = new Date();
        date.setDate(date.getDate() - index * 9);
        const answers = {};
        SECTION_SCHEMAS.forEach((section, sectionIndex) => section.groups.forEach((group) => group.fields.forEach((field) => {
            if (field.id.startsWith('member-') || (!completed && sectionIndex > index % 4))
                return;
            answers[`section-${sectionIndex + 1}-${field.id}`] =
                field.options?.[0] ??
                    (field.type === 'date'
                        ? '2026-05-01'
                        : field.type === 'time'
                            ? '09:30'
                            : field.type === 'number'
                                ? '2'
                                : field.type === 'email'
                                    ? 'ejemplo@example.com'
                                    : 'Dato de ejemplo');
        })));
        Object.assign(answers, {
            'section-1-0': id,
            'section-1-1': 'CC',
            'section-1-2': String(1020304000 + index),
            'section-1-3': surname,
            'section-1-4': 'Pérez',
            'section-1-5': name,
            'section-1-6': '',
            'section-1-7': '1985-06-15',
            'section-1-19': 'Funcionario de demostración',
            'section-1-21': date.toISOString().slice(0, 10),
            'section-2-23': scenario.eventDate,
            'section-2-25': scenario.department,
            'section-2-26': scenario.municipality,
            'section-2-30': scenario.principal,
        });
        const varied = {
            sexo: ['Femenino', 'Masculino', 'Intersexual', 'Otro'],
            momento: ['Durante el evento', 'Preventiva / antes del impacto', 'Posterior al evento', 'Mixta o salidas sucesivas'],
            caracter: ['Forzada', 'Voluntaria', 'Mixta', 'Por verificar'],
            fuera: ['Sí', 'No', 'No sabe / No responde'],
            alojamiento: ['Albergue temporal', 'Vivienda de familiar o tercero', 'Arrendamiento', 'Asentamiento informal', 'Retorno parcial', 'Vivienda propia recuperada', 'Refugio improvisado', 'Reasentamiento'],
            retorno: ['No', 'Sí', 'No sabe / No responde'],
        };
        answers['section-1-8'] = varied.sexo[index % varied.sexo.length];
        if (answers['section-2-39']) Object.assign(answers, {
            'section-2-42': scenario.municipality,
            'section-2-45': varied.momento[index % varied.momento.length],
            'section-2-46': varied.caracter[index % varied.caracter.length],
            'section-2-47': varied.alojamiento[index % varied.alojamiento.length],
        });
        for (const [section, dep, mun] of [
            [1, 11, 12],
            [1, 15, 16],
            [2, 25, 26],
            [2, 41, 42],
            [2, 48, 49],
        ]) {
            if (answers[`section-${section}-${dep}`]) {
                answers[`section-${section}-${dep}`] = scenario.department;
                answers[`section-${section}-${mun}`] = scenario.municipality;
            }
        }
        if (answers['section-4-53']) answers['section-4-53'] = '';
        const count = ['flood', 'coastal', 'evacuation'].includes(selectedEvent) ? 5 : 4;
        if (completed)
            for (let i = 0; i < count; i++)
                answers[`${selectedEvent}-${i}`] = 'Sí';
        const story = completed
            ? 'Registro ficticio para demostración. La familia relata que tuvo que abandonar su vivienda debido al evento ocurrido en su municipio. Las autoridades locales coordinaron el traslado hacia un alojamiento temporal y brindaron atención inicial. Se reportaron afectaciones a los bienes y a la actividad económica del hogar. La familia solicita acompañamiento para recuperar sus condiciones de vida y acceder a las medidas de atención correspondientes.'
            : '';
        const fields = SECTION_SCHEMAS.flatMap((s, si) => s.groups.flatMap((g) => g.fields.map((f) => `section-${si + 1}-${f.id}`)));
        const progress = Math.round(((fields.filter((k) => answers[k]?.trim()).length +
            (story ? 1 : 0) +
            (completed ? count : 0)) /
            (fields.length + 1 + count)) *
            100);
        return {
            revisionRuda: 8,
            id,
            status: completed ? 'completed' : 'pending',
            createdAt: date.toISOString(),
            savedAt: date.toISOString(),
            activeSection: completed ? 1 : (index % 4) + 1,
            progress,
            story,
            selectedEvent,
            answers,
        };
    });
}
