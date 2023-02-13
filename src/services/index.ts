import { CONTEXT } from './../constants'
import servicesAphp, { IServiceAphp } from 'services/contextAphp'
import servicesChut, { IServiceChut } from 'services/contextchu-toulouse'
import servicesArkhn, { IServiceArkhn } from 'services/contextArkhn'

let services: IServiceAphp | IServiceArkhn | IServiceChut = servicesAphp
switch (CONTEXT) {
  case 'aphp':
    services = servicesAphp
    break
  case 'arkhn':
    services = servicesArkhn
    break
  case 'chu-toulouse':
    services = servicesChut
    break
  default:
    break
}

export default services
