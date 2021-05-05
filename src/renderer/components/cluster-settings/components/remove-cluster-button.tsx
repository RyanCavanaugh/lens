import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { ClusterStore } from "../../../../common/cluster-store";
import { Cluster } from "../../../../main/cluster";
import { Button } from "../../button";
import { ConfirmDialog } from "../../confirm-dialog";

interface Props {
  cluster: Cluster;
}

@observer
export class RemoveClusterButton extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  confirmRemoveCluster = () => {
    const { cluster } = this.props;

    ConfirmDialog.open({
      message: <p>Are you sure you want to remove <b>{cluster.preferences.clusterName}</b> from Lens?</p>,
      labelOk: "Yes",
      labelCancel: "No",
      ok: async () => {
        await ClusterStore.getInstance().removeById(cluster.id);
      }
    });
  };

  render() {
    return (
      <Button accent onClick={this.confirmRemoveCluster} className="button-area">
        Remove Cluster
      </Button>
    );
  }
}