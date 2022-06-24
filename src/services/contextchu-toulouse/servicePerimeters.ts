import { CohortData, ScopeTreeRow } from 'types'
import { IGroup, IOrganization, IExtension } from '@ahryman40k/ts-fhir-types/lib/R4'
import {
  getGenderRepartitionMapAphp,
  getAgeRepartitionMapAphp,
  getEncounterRepartitionMapAphp,
  getVisitRepartitionMapAphp
} from 'utils/graphUtils'
import { getApiResponseResources } from 'utils/apiHelpers'

import { fetchGroup, fetchPatient, fetchEncounter, fetchOrganization } from './callApi'

import apiBackend from '../apiBackend'

const loadingItem: ScopeTreeRow = { id: 'loading', name: 'loading', quantity: 0, subItems: [] }

export interface IServicePerimeters {
  /**
   * Cette fonction retourne les informations lié à un (ou plusieur) périmètre(s)
   *
   * Argument:
   *   - perimetersId: ID du périmètre (liste d'ID séparé par des virgules)
   *
   * Retour:
   *   - CohortData | undefined
   */
  fetchPerimetersInfos: (perimetersId: string) => Promise<CohortData | undefined>

  /**
   * Cette fonction retourne les informations lié à un périmètre
   * (Cette fonction n'est appelée que lors de la transformation du JSON en carte dans le requeteur)
   *
   * Argument:
   *   - perimeterId: ID du périmètre
   *
   * Retour:
   *   - ScopeTreeRow | undefined
   */
  fetchPerimeterInfoForRequeteur: (perimeterId: string) => Promise<ScopeTreeRow | undefined>

  /**
   * Cette fonction retroune l'ensemble des perimetres auquels un practitioner a le droit
   *
   * Argument:
   *   - practitionerId: Identifiant technique du practitioner
   *
   * Retour:
   *   - IOrganization[]
   */
  getPerimeters: () => Promise<IOrganization[]>

  /**
   * Cette fonction se base sur la fonction `getPerimeters` du service, et ré-organise la donnée sous forme d'un ScopeTreeRow[]
   *
   * Argument:
   *   - practitionerId: Identifiant technique du practitioner
   *
   * Retour:
   *   - ScopeTreeRow[]
   */
  getScopePerimeters: (practitionerId: string) => Promise<ScopeTreeRow[]>

  /**
   * Cette fonction retoune l'ensemble des périmètres enfant d'un périmètre passé en argument
   *
   * Argument:
   *   - perimeter: Périmètres parent (récupéré par `getScopePerimeters`)
   *   - getSubItem: = true si on demande à avoir les enfants des enfants
   *
   * Retour:
   *   - ScopeTreeRow[]
   */
  getScopeSubItems: (perimeter: ScopeTreeRow | null, getSubItem?: boolean) => Promise<ScopeTreeRow[]>

  /**
   * Cette fonction retourne les droits de lecture d'un périmetre
   *
   * Arguments:
   *   - perimetersId: ID du périmètre (liste d'ID séparé par des virgules)
   */
  fetchPerimetersRights: (perimeters: IGroup[]) => Promise<IGroup[]>
}

const servicesPerimeters: IServicePerimeters = {
  fetchPerimetersInfos: async (perimetersId) => {
    let permieters
    let perimeters : IGroup[] = []

    const [perimetersResp, patientsResp, encountersResp] = await Promise.all([
      fetchGroup({
        _id: perimetersId
      }),
      fetchPatient({
        pivotFacet: ['age_gender', 'deceased_gender'],
        _list: perimetersId.split(','),
        size: 20,
        _sort: 'given',
        _elements: ['gender', 'name', 'birthDate', 'deceased', 'identifier', 'extension']
      }),
      fetchEncounter({
        facet: ['class', 'visit-year-month-gender-facet'],
        _list: perimetersId.split(','),
        size: 0,
        type: 'VISIT'
      })
    ])

    const cohort = await servicesPerimeters.fetchPerimetersRights(getApiResponseResources(perimetersResp) ?? [])

    const totalPatients = patientsResp?.data?.resourceType === 'Bundle' ? patientsResp.data.total : 0

    const originalPatients = getApiResponseResources(patientsResp)

    const ageFacet = patientsResp.data.meta?.extension?.filter((facet: any) => facet.url === 'facet-age-month')
    const deceasedFacet = patientsResp.data.meta?.extension?.filter((facet: any) => facet.url === 'facet-deceased')
    const visitFacet = encountersResp.data.meta?.extension?.filter(
      (facet: any) => facet.url === 'facet-visit-year-month-gender-facet'
    )
    const classFacet = encountersResp.data.meta?.extension?.filter((facet: any) => facet.url === 'facet-class-simple')

    const agePyramidData =
      patientsResp?.data?.resourceType === 'Bundle'
        ? getAgeRepartitionMapAphp(ageFacet && ageFacet[0] && ageFacet[0].extension)
        : undefined
    const genderRepartitionMap =
      patientsResp?.data?.resourceType === 'Bundle'
        ? getGenderRepartitionMapAphp(deceasedFacet && deceasedFacet[0] && deceasedFacet[0].extension)
        : undefined
    const monthlyVisitData =
      encountersResp?.data?.resourceType === 'Bundle'
        ? getVisitRepartitionMapAphp(visitFacet && visitFacet[0] && visitFacet[0].extension)
        : undefined
    const visitTypeRepartitionData =
      encountersResp?.data?.resourceType === 'Bundle'
        ? getEncounterRepartitionMapAphp(classFacet && classFacet[0] && classFacet[0].extension)
        : undefined

    return {
      cohort,
      totalPatients,
      originalPatients,
      genderRepartitionMap,
      visitTypeRepartitionData,
      agePyramidData,
      monthlyVisitData
    }
  },

  fetchPerimeterInfoForRequeteur: async (perimeterId) => {
    try {
      if (!perimeterId) return undefined

      // Get perimeter info with `perimeterId`
      const groupResults = await fetchGroup({
        _id: perimeterId
      })

      // Construct an `orgazationId`
      let organiszationId =
        groupResults && groupResults.data && groupResults.data.resourceType === 'Bundle'
          ? groupResults.data.entry && groupResults.data.entry.length > 0
            ? groupResults.data.entry[0].resource?.managingEntity?.display ?? ''
            : ''
          : ''
      organiszationId = organiszationId ? organiszationId.replace('Organization/', '') : ''
      if (!organiszationId) return undefined

      // Get perimeter info with `organiszationId`
      const organizationResult = await fetchOrganization({
        _id: organiszationId,
        _elements: ['name', 'extension', 'alias']
      })

      // Convert result in ScopeTreeRow
      const organization =
        organizationResult && organizationResult.data && organizationResult.data.resourceType === 'Bundle'
          ? organizationResult.data.entry && organizationResult.data.entry.length > 0
            ? organizationResult.data.entry[0].resource
            : undefined
          : undefined

      const getScopeName = (perimeter: any) => {
        const perimeterID = perimeter ? perimeter.alias?.[0] : false
        if (!perimeterID) {
          return perimeter ? perimeter.name : ''
        }
        return `${perimeterID} - ${perimeter.name}`
      }

      const scopeRows: ScopeTreeRow | undefined = organization
        ? {
            ...organization,
            id: organization.id ?? '',
            name: getScopeName(organization),
            quantity:
              organization.extension && organization.extension.length > 0
                ? organization.extension.find((extension: any) => extension.url === 'cohort-size')?.valueInteger ?? 0
                : 0,
            subItems: []
          }
        : undefined
      return scopeRows
    } catch (error) {
      return undefined
    }
  },

  getPerimeters: async () => {
    try {
      const rightResponse = await apiBackend.get('accesses/my-rights/?pop-children')
      const rightsData: any[] = rightResponse.status === 200 ? (rightResponse?.data as any[]) : []

      let perimetersIds = []
      let organizationList: IOrganization[] = []

      if (rightResponse.status !== 200 || (rightsData && rightsData.length === 0)) {
        return []
      }

      // Mapping the right data to the actual id stored in "source_value"
      perimetersIds = await Promise.all(
        rightsData.map(async (rightData) => {
          const perimeterResponse = await apiBackend.get(`care-sites/${rightData.care_site_id}/`)
          const perimeterData: any = perimeterResponse.status === 200 ? (perimeterResponse?.data as any) : {}
          const perimetersId: string = perimeterData.source_value ?? ''
          return perimetersId
        })
      )

      if (perimetersIds.length > 0) {
        const organisationResult = await fetchOrganization({
          _id: perimetersIds.join(','),
          _elements: ['name', 'extension', 'alias']
        })

        organizationList = getApiResponseResources(organisationResult) ?? []
        organizationList = organizationList.map((organizationItem) => {
          const foundRight = rightsData.find((rightData) => rightData.care_site_id === +(organizationItem.id ?? '0'))

          return {
            ...organizationItem,
            extension: [
              ...(organizationItem.extension ?? []),
              {
                url: 'READ_ACCESS',
                valueString: foundRight?.right_read_patient_nominative ? 'DATA_NOMINATIVE' : 'DATA_PSEUDOANONYMISED'
              },
              {
                url: 'EXPORT_ACCESS',
                valueString: 'DATA_PSEUDOANONYMISED' // Impossible de faire un export de donnée sur un périmètre
              }
            ]
          }
        })
      }
      return organizationList
    } catch (error) {
      console.error('Error (getPerimeters) :', error)
      return []
    }
  },

  getScopePerimeters: async (practitionerId) => {
    if (!practitionerId) return []

    console.log('getScopePerimeters', practitionerId)

    const perimetersResults = (await servicesPerimeters.getPerimeters()) ?? []

    console.log('getScopePerimeters', perimetersResults)

    let scopeRows: ScopeTreeRow[] = []

    for (const perimetersResult of perimetersResults) {
      const scopeRow: ScopeTreeRow = perimetersResult as ScopeTreeRow

      scopeRow.name = getScopeName(perimetersResult)
      scopeRow.quantity = getQuantity(perimetersResult.extension)
      scopeRow.access = getAccessName(perimetersResult.extension)
      scopeRow.subItems = await servicesPerimeters.getScopeSubItems(perimetersResult as ScopeTreeRow)

      console.log('getScopePerimeters', scopeRow)

      scopeRows = [...scopeRows, scopeRow]
    }

    // Sort by quantity
    scopeRows = scopeRows.sort((a: ScopeTreeRow, b: ScopeTreeRow) => {
      if (a.quantity > b.quantity) {
        return 1
      } else if (a.quantity < b.quantity) {
        return -1
      }
      return 0
    })
    // Sort by name
    scopeRows = scopeRows.sort((a: ScopeTreeRow, b: ScopeTreeRow) => {
      if (b.quantity === 0) return -1
      if (a.name > b.name) {
        return 1
      } else if (a.name < b.name) {
        return -1
      }
      return 0
    })

    return scopeRows
  },

  getScopeSubItems: async (perimeter: ScopeTreeRow | null, getSubItem?: boolean) => {
    // TODO : REFAIRE CETTE FONCTION UNE FOIS LE FHIR OK

    if (!perimeter) return []

    const perimeterResponse = await apiBackend.get(`care-sites/?source_value=${perimeter.id}`)
    const perimeterData: any = perimeterResponse.status === 200 ? (perimeterResponse?.data as any[]) : {}
    if (perimeterData.results?.length <= 0) return []
    const perimeterId = perimeterData.results[0].id

    let childrenPerimeterResponse = await apiBackend.get(`care-sites/${perimeterId}/children/`)
    let childrenPerimeterData: any =
      childrenPerimeterResponse.status === 200 ? (childrenPerimeterResponse?.data as any[]) : {}

    let childrenPerimeterFhirId: any[] =
      childrenPerimeterData.results?.map((perimeter: any) => perimeter.source_value) ?? []

    while (childrenPerimeterData.next) {
      childrenPerimeterResponse = await apiBackend.get(childrenPerimeterData.next)
      childrenPerimeterData = childrenPerimeterResponse.status === 200 ? (childrenPerimeterResponse?.data as any[]) : {}
      childrenPerimeterFhirId = [
        ...childrenPerimeterFhirId,
        ...childrenPerimeterData.results.map((perimeter: any) => perimeter.source_value)
      ]
    }

    if (!childrenPerimeterFhirId) return []

    let subScopeRows: ScopeTreeRow[] = []

    const childrenPerimeterFhirIdChunks = childrenPerimeterFhirId.reduce((all, one, i) => {
      const ch = Math.floor(i / 20)
      all[ch] = [].concat(all[ch] || [], one)
      return all
    }, [])

    for (const childrenIds of childrenPerimeterFhirIdChunks) {
      const organization = await fetchOrganization({
        _id: childrenIds.join(','),
        _elements: ['name', 'extension', 'alias']
      })

      if (!organization) continue

      const organizationData = getApiResponseResources(organization) || []
      if (organizationData.length === 0) continue

      for (const organizationItem of organizationData) {
        const scopeRow: ScopeTreeRow = organizationItem as ScopeTreeRow
        scopeRow.name = getScopeName(organizationItem)
        scopeRow.quantity = getQuantity(organizationItem.extension)
        scopeRow.access = perimeter.access
        scopeRow.subItems =
          getSubItem === true
            ? await servicesPerimeters.getScopeSubItems(organizationItem as ScopeTreeRow)
            : [loadingItem]
        subScopeRows = [...subScopeRows, scopeRow]
      }
    }

    // Sort by name
    subScopeRows = subScopeRows.sort((a: ScopeTreeRow, b: ScopeTreeRow) => {
      if (a.quantity > b.quantity) {
        return 1
      } else if (a.quantity < b.quantity) {
        return -1
      }
      return 0
    })
    subScopeRows = subScopeRows.sort((a: ScopeTreeRow, b: ScopeTreeRow) => {
      if (b.quantity === 0) return -1
      if (a.name > b.name) {
        return 1
      } else if (a.name < b.name) {
        return -1
      }
      return 0
    })

    return subScopeRows
  },

  fetchPerimetersRights: async (perimeters) => {
    const caresiteIds = perimeters
      .map((perimeter) =>
        perimeter.managingEntity?.display?.search('Organization/') !== -1
          ? perimeter.managingEntity?.display?.replace('Organization/', '')
          : ''
      )
      .filter((item: any, index: number, array: any[]) => item && array.indexOf(item) === index)
      .join(',')

    const rightResponse = await apiBackend.get(`accesses/my-rights/?care-site-ids=${caresiteIds}`)
    const rightsData = (rightResponse.data as any[]) ?? []

    return perimeters.map((perimeter) => {
      const caresiteId =
        perimeter.managingEntity?.display?.search('Organization/') !== -1
          ? perimeter.managingEntity?.display?.replace('Organization/', '')
          : ''
      const foundRight = rightsData.find((rightData) => rightData.care_site_id === +(caresiteId ?? '0'))

      return {
        ...perimeter,
        extension: [
          ...(perimeter.extension ?? []),
          {
            url: 'READ_ACCESS',
            valueString: foundRight?.right_read_patient_nominative ? 'DATA_NOMINATIVE' : 'DATA_PSEUDOANONYMISED'
          },
          {
            url: 'EXPORT_ACCESS',
            valueString: 'DATA_PSEUDOANONYMISED' // Impossible de faire un export de donnée sur un périmètre
          }
        ]
      }
    })
  }
}

export default servicesPerimeters

const getScopeName = (perimeter: any) => {
  const perimeterID = perimeter ? perimeter.alias?.[0] : false
  if (!perimeterID) {
    return perimeter ? perimeter.name : ''
  }
  return `${perimeterID} - ${perimeter.name}`
}

const getQuantity = (extension?: IExtension[]) => {
  const accessExtension = extension?.find((extension) => extension.url === 'cohort-size')
  if (!extension || !accessExtension) {
    return 0
  }
  return accessExtension.valueInteger || 0
}

const getAccessName = (extension?: IExtension[]) => {
  const accessExtension = extension?.find((extension) => extension.url === 'READ_ACCESS')
  if (!extension || !accessExtension) {
    return ''
  }
  const access = accessExtension?.valueString

  switch (access) {
    case 'DATA_PSEUDOANONYMISED':
      return 'Pseudonymisé'
    default:
      return 'Nominatif'
  }
}
