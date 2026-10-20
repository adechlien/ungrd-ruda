declare module 'colombia-territorial' {
  export interface MunicipioColombiano {
    nombre: string;
    codigo_dane: string;
  }

  export interface DepartamentoColombiano {
    nombre: string;
    codigo_dane: string;
    capital: string;
    municipios: MunicipioColombiano[];
  }

  export const departamentos: DepartamentoColombiano[];
}
