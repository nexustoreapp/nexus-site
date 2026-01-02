export function onlyDigits(s=""){ return String(s).replace(/\D/g,""); }

export function isValidCPF(cpf){
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i=0;i<9;i++) sum += parseInt(cpf[i])*(10-i);
  let d1 = 11 - (sum % 11); if (d1>=10) d1=0;
  if (d1 !== parseInt(cpf[9])) return false;

  sum = 0;
  for (let i=0;i<10;i++) sum += parseInt(cpf[i])*(11-i);
  let d2 = 11 - (sum % 11); if (d2>=10) d2=0;
  if (d2 !== parseInt(cpf[10])) return false;

  return true;
      }
