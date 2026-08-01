/*
  Junta clases y descarta lo que no aplica, para poder escribir

    cx("id-card", checked && "tenida", enVisita && "solo-lectura")

  sin ensuciar el atributo con `false` ni `undefined`. Es lo único que se
  extraña al pasar de objetos de estilo a clases: con objetos alcanzaba con
  esparcir `{}` cuando la condición era falsa.
*/
export const cx = (...clases) => clases.filter(Boolean).join(" ");
