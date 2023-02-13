import { CONTEXT } from './../constants'
import servicesAphp, { IServiceAphp } from 'services/aphp'
import servicesChut, { IServiceChut } from 'services/chu-toulouse'

let services: IServiceAphp | IServiceChut = servicesAphp
switch (CONTEXT) {
  case 'aphp':
    services = servicesAphp
    break
  case 'chu-toulouse':
    services = servicesChut
    break
  default:
    break
}

export default services
