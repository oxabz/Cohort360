import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Typography
} from '@material-ui/core'
import React, { useEffect, useState } from 'react'
import { useHistory } from 'react-router'
import { Link } from 'react-router-dom'
import { useKeycloak } from '../../services/serviceAuth'

import logo from 'assets/images/logo-login.png'
import useStyles from './styles'
import services from 'services'
import { login as loginAction } from 'state/me'
import { useAppDispatch } from 'state'

import NoRights from 'components/ErrorView/NoRights'

function LegalMentionDialog({ open, setOpen }: { open: boolean; setOpen: Function }) {
  const _setOpen = () => {
    if (setOpen && typeof setOpen === 'function') {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onClose={_setOpen}>
      <DialogTitle>Mention légale</DialogTitle>
      <DialogContent>
        <DialogContentText align="justify">
          L’usage de Cohort360 est soumis au respect des règles d’accès aux données de santé définies par la Commission
          Médicale d’Etablissement de l’AP-HP disponibles à l’adresse recherche-innovation.aphp.fr.
        </DialogContentText>
        <DialogContentText>
          En appuyant sur le bouton « OK », vous acceptez ces conditions d’utilisation. Les données relatives à votre
          connexion et à vos actions sur l’application (date, heure, type d’action), sont enregistrées et traitées pour
          des finalités de sécurité du système d’information et afin de réaliser des statistiques d’utilisation de
          l’application.
        </DialogContentText>
        <DialogContentText>
          Elles sont destinées à l’équipe projet de la DSI et sont conservées dans des fichiers de logs pendant 3 ans.
          Vous pouvez exercer votre droit d’accès et de rectification aux informations qui vous concernent, en écrivant
          à la déléguée à la protection des données de l’AP-HP à l’adresse protection.donnees.dsi@aphp.fr.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>OK</Button>
      </DialogActions>
    </Dialog>
  )
}

const Landing: React.FC<void> = () => {
  const [noRights, setNoRights] = useState(false)
  const [legalMentions, setMentions] = useState(false)
  const [authenticated, kc] = useKeycloak()
  const history = useHistory()
  const classes = useStyles()
  const dispatch = useAppDispatch()

  const login = async () => {
    const userInfo: any = kc.userInfo
    const username = userInfo.preferred_username

    const practitioner = await services.practitioner.fetchPractitioner(username)
    const lastConnection = kc.refreshTokenParsed?.auth_time
      ? new Date(kc.refreshTokenParsed.auth_time).toLocaleString()
      : undefined
    const maintenanceResponse = await (services.practitioner as any).maintenance()
    const maintenance = maintenanceResponse?.data

    if (practitioner) {
      const practitionerPerimeters = await services.perimeters.getPerimeters()
      if (practitionerPerimeters.length === 0) {
        localStorage.setItem('no-rights', 'true')
        setNoRights(true)
        kc.logout()
        return
      }

      const nominativeGroupsIds = practitionerPerimeters
        .filter(({ extension }) =>
          (extension ?? []).some(({ url, valueString }) => url === 'READ_ACCESS' && valueString === 'DATA_NOMINATIVE')
        )
        .map((practitionerPerimeter) => {
          const groupId = practitionerPerimeter.extension?.find(({ url }) => url === 'cohort-id')
            ? `${practitionerPerimeter.extension?.find(({ url }) => url === 'cohort-id')?.valueInteger ?? 0}`
            : ''
          return groupId
        })
        .filter((item) => item)

      dispatch(
        loginAction({
          ...practitioner,
          id: `${practitioner.id}`,
          userName: `${practitioner.userName}`,
          nominativeGroupsIds,
          deidentified: nominativeGroupsIds.length === 0,
          lastConnection,
          maintenance
        })
      )

      const oldPath = localStorage.getItem('old-path')
      localStorage.removeItem('old-path')
      history.push(oldPath ?? '/home')
    }
  }

  useEffect(() => {
    if (authenticated) login()
    if (localStorage.getItem('no-rights') === 'true') {
      setNoRights(true)
      localStorage.setItem('no-rights', 'false')
    }
  }, [])

  const _onLogin = () => {
    kc.login()
  }

  if (noRights === true) return <NoRights />

  return (
    <>
      <Grid container component="main" className={classes.root}>
        <Grid item xs={false} sm={6} md={6} className={classes.image} />
        <Grid
          container
          item
          xs={12}
          sm={6}
          md={6}
          direction="column"
          justifyContent="center"
          alignItems="center"
          className={classes.rightPanel}
        >
          <Grid container item xs={8} lg={6} direction="column" alignItems="center">
            <img className={classes.logo} src={logo} alt="Logo Cohort360" />
            <Typography color="primary" className={classes.bienvenue}>
              Bienvenue ! Connectez-vous.
            </Typography>

            <Button
              fullWidth
              color="primary"
              className={classes.submit}
              id="connection-button-submit"
              onClick={_onLogin}
            >
              <img
                className={classes.connectIcon}
                src="https://www.keycloak.org/resources/images/keycloak_icon_512px.svg"
                alt="Keycloak"
              />{' '}
              Connection avec Keycloak
            </Button>
            <Typography align="center" className={classes.mention}>
              <Link href="#" onClick={() => setMentions(true)} to={'#'}>
                En cliquant sur &quot;connexion&quot;, vous acceptez la mention légale.
              </Link>
            </Typography>
          </Grid>
        </Grid>
      </Grid>
      <LegalMentionDialog open={legalMentions} setOpen={setMentions} />
    </>
  )
}

export default Landing
