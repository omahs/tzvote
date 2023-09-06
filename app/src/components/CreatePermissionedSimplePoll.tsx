import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonIcon,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRow,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { format, utcToZonedTime } from "date-fns-tz";

import { useIonAlert } from "@ionic/react";
import {
  addCircleOutline,
  radioButtonOffOutline,
  returnUpBackOutline,
  trashBinOutline,
} from "ionicons/icons";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { PAGES, UserContext, UserContextType } from "../App";
import { TransactionInvalidBeaconError } from "../contractutils/TezosUtils";
import { Storage as PermissionedSimplePollVotingContract } from "../permissionedSimplePoll.types";
import { address, asMap, int, timestamp } from "../type-aliases";

import jsonContractTemplate from "../contracttemplates/permissionedSimplePoll.json";
import { VOTING_TEMPLATE } from "../contractutils/TezosUtils";

// Get the time zone set on the user's device
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const CreatePermissionedSimplePoll: React.FC = () => {
  const { Tezos, userAddress, bakerDelegators, reloadUser, BLOCK_TIME } =
    React.useContext(UserContext) as UserContextType;

  const { push, goBack } = useHistory();

  //TEZOS OPERATIONS
  const [loading, setLoading] = React.useState(false);

  // MESSAGES

  const [presentAlert] = useIonAlert();

  // CURRRENT CONTRACT

  const [contract, setContract] =
    useState<PermissionedSimplePollVotingContract>({
      name: "Enter question here ...",
      from_: format(
        utcToZonedTime(new Date(), userTimeZone),
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        { timeZone: userTimeZone }
      ) as timestamp,
      to: format(
        utcToZonedTime(new Date(), userTimeZone),
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        { timeZone: userTimeZone }
      ) as timestamp,
      options: [],
      registeredVoters: [],
      results: asMap<string, int>([]),
      votes: asMap<address, string>([]),
      owner: userAddress as address,
    });

  useEffect(() => {
    contract.owner = userAddress as address;
  }, [userAddress]);

  const [inputOption, setInputOption] = useState<string>("");
  const [inputVoter, setInputVoter] = useState<string>("");

  const createVoteContract = async () => {
    //block if no option
    if (contract.options == undefined || contract.options.length == 0) {
      console.log("At least one option is needed...");
      return;
    }

    //block if no option
    if (!contract.from_ || !contract.to) {
      console.log("All dates are required");
      return;
    }

    setLoading(true);

    try {
      const op = await Tezos.wallet
        .originate({
          code: jsonContractTemplate,
          storage: {
            name: contract.name,
            from_: new Date(contract.from_).toISOString(),
            to: new Date(contract.to).toISOString(),
            options: contract.options,
            owner: contract.owner,
            registeredVoters: contract.registeredVoters,
            results: contract.results, //MichelsonMap<string, int>
            votes: contract.votes, //MichelsonMap<address, string>
          },
        })
        .send();

      setTimeout(async () => {
        setLoading(false);
        presentAlert({
          header: "Success",
          message: `Origination completed for ${
            (await op.contract()).address
          }.`,
        });
        push(PAGES.SEARCH);
      }, BLOCK_TIME);
    } catch (error) {
      console.table(`Error: ${JSON.stringify(error, null, 2)}`);
      let tibe: TransactionInvalidBeaconError =
        new TransactionInvalidBeaconError(error);
      presentAlert({
        header: "Error",
        message: tibe.data_message,
      });
    } finally {
      setLoading(false);
    }
  };

  //EFFECTS
  React.useEffect(() => {
    //in case of forced page refresh
    if (!userAddress) {
      (async () => {
        await reloadUser();
      })();
    }
  }, []); //init load

  return (
    <IonPage className="container">
      {loading ? (
        <div className="spin">
          <IonSpinner name="lines-sharp" color="primary" />
        </div>
      ) : (
        <>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={goBack}>
                  <IonIcon icon={returnUpBackOutline}></IonIcon>
                  <IonLabel>Back</IonLabel>
                </IonButton>
              </IonButtons>
              <IonButtons slot="end">
                <IonButton
                  disabled={
                    !contract.name ||
                    !contract.from_ ||
                    !contract.to ||
                    contract.options.length == 0
                  }
                  onClick={createVoteContract}
                >
                  <IonLabel>Create</IonLabel>
                </IonButton>
              </IonButtons>

              <IonTitle>
                <IonRow>
                  Create &nbsp;
                  <IonAvatar style={{ height: "20px", width: "20px" }}>
                    <IonImg
                      alt="Silhouette of a person's head"
                      src="/permissioned.png"
                    />
                  </IonAvatar>
                  &nbsp; Poll
                </IonRow>
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent fullscreen>
            <IonCard>
              <IonCardHeader>
                <IonTitle>Description</IonTitle>
                <IonCardSubtitle>
                  {VOTING_TEMPLATE.PERMISSIONEDSIMPLEPOLL.description}
                </IonCardSubtitle>
              </IonCardHeader>

              <IonCardContent></IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonTitle>Question</IonTitle>
              </IonCardHeader>

              <IonCardContent>
                <IonTextarea
                  autoGrow
                  labelPlacement="floating"
                  color="primary"
                  required
                  id="name"
                  placeholder="Type question here ..."
                  maxlength={100}
                  counter
                  onIonInput={(e) => {
                    setContract({
                      ...contract,
                      name: e.target.value!,
                    } as PermissionedSimplePollVotingContract);
                  }}
                />
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonTitle>Dates</IonTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel>Start date</IonLabel>
                  <IonDatetimeButton datetime="from_"></IonDatetimeButton>
                  <IonModal keepContentsMounted={true}>
                    <IonDatetime
                      id="from_"
                      value={contract.from_}
                      onIonChange={(e) => {
                        setContract({
                          ...contract,
                          from_: e.target.value!,
                        } as PermissionedSimplePollVotingContract);
                      }}
                    ></IonDatetime>
                  </IonModal>
                </IonItem>
                <IonItem>
                  <IonLabel>End date</IonLabel>
                  <IonDatetimeButton datetime="to"></IonDatetimeButton>
                  <IonModal keepContentsMounted={true}>
                    <IonDatetime
                      id="to"
                      value={contract.to}
                      onIonChange={(e) => {
                        setContract({
                          ...contract,
                          to: e.target.value!,
                        } as PermissionedSimplePollVotingContract);
                      }}
                    ></IonDatetime>
                  </IonModal>
                </IonItem>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonTitle>Options</IonTitle>
                <IonCardSubtitle>
                  <IonRow>
                    <IonInput
                      style={{ width: "80%" }}
                      value={inputOption}
                      label="New option to add"
                      labelPlacement="floating"
                      color="primary"
                      required
                      id="name"
                      placeholder="Enter new option here ..."
                      maxlength={100}
                      counter
                      onIonInput={(e) => {
                        setInputOption(e.target.value as string);
                      }}
                    ></IonInput>

                    <IonButton
                      style={{ marginLeft: "1em" }}
                      onClick={() => {
                        setContract({
                          ...contract,
                          options: contract.options.concat(inputOption),
                        } as PermissionedSimplePollVotingContract);
                        setInputOption("");
                      }}
                    >
                      <IonIcon icon={addCircleOutline} />
                    </IonButton>
                  </IonRow>
                </IonCardSubtitle>
              </IonCardHeader>

              <IonCardContent>
                {" "}
                <IonList lines="inset" inputMode="text">
                  {contract.options.map((option: string, index: number) => (
                    <IonItem key={index}>
                      <IonLabel>
                        <IonIcon icon={radioButtonOffOutline} /> &nbsp; {option}
                      </IonLabel>

                      <IonIcon
                        color="danger"
                        icon={trashBinOutline}
                        onClick={() => {
                          contract.options.splice(index, 1);
                          setContract({
                            ...contract,
                            options: contract.options,
                          } as PermissionedSimplePollVotingContract);
                        }}
                      />
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonTitle>Voters</IonTitle>
                <IonCardSubtitle>
                  <IonRow>
                    <IonInput
                      style={{ width: "80%" }}
                      value={inputVoter}
                      label="New voter to add"
                      labelPlacement="floating"
                      color="primary"
                      required
                      id="name"
                      placeholder="Enter new voter here ..."
                      maxlength={100}
                      counter
                      onIonInput={(e) => {
                        setInputVoter(e.target.value as string);
                      }}
                    ></IonInput>

                    <IonButton
                      style={{ marginLeft: "1em" }}
                      onClick={() => {
                        setContract({
                          ...contract,
                          registeredVoters: [
                            ...contract.registeredVoters,
                            inputVoter as address,
                          ],
                        } as PermissionedSimplePollVotingContract);
                        setInputVoter("");
                      }}
                    >
                      <IonIcon icon={addCircleOutline} />
                    </IonButton>
                    {bakerDelegators.length > 0 ? (
                      <IonButton
                        style={{ marginRight: "1em", marginBottom: "0.2em" }}
                        onClick={() => {
                          setContract({
                            ...contract,
                            registeredVoters: [...bakerDelegators],
                          } as PermissionedSimplePollVotingContract);
                        }}
                      >
                        <IonIcon icon={addCircleOutline} /> &nbsp; delegators
                      </IonButton>
                    ) : (
                      ""
                    )}
                  </IonRow>
                </IonCardSubtitle>
              </IonCardHeader>

              <IonCardContent>
                <IonList inputMode="text">
                  {contract.registeredVoters.map(
                    (voter: string, index: number) => (
                      <IonItem key={voter}>
                        <IonLabel>
                          <IonIcon icon={radioButtonOffOutline} /> &nbsp;{" "}
                          {voter}
                        </IonLabel>

                        <IonIcon
                          color="danger"
                          icon={trashBinOutline}
                          onClick={() => {
                            contract.registeredVoters.splice(index, 1);
                            setContract({
                              ...contract,
                              registeredVoters: contract.registeredVoters,
                            } as PermissionedSimplePollVotingContract);
                          }}
                        />
                      </IonItem>
                    )
                  )}
                </IonList>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </>
      )}
    </IonPage>
  );
};

export default CreatePermissionedSimplePoll;
